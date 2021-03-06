declare module "nova-base" {

    // IMPORTS
    // --------------------------------------------------------------------------------------------
    import * as http from 'http';

    // ACTION
    // --------------------------------------------------------------------------------------------
    export interface RequestorInfo {
        readonly auth?  : any;
        readonly ip?    : string;
    }

    export interface Action<V,T> {
        (this: ActionContext, inputs: V): Promise<T>;
    }
        
    export interface ActionAdapter<V> {
        (this: ActionContext, inputs: any, authInfo?: any, ip?: string): Promise<V>;
    }

    export interface ActionContext {
        readonly dao        : Dao;
        readonly cache      : Cache;
        readonly logger     : Logger;
        readonly timestamp  : number;

        register(task: Task);
        register(notice: Notice);

        clear(filter: NoticeFilter);
        clear(action: Action<any,any>);

        invalidate(key: string);
        isInvalid(key: string): boolean;

        run<V,T>(action: Action<V,T>, inputs: V): Promise<T>;
        defer<V,T>(action: Action<V,T>, inputs: V): void;

        suppress(action: Action<any,any>, tag: Symbol);
        suppress(actions: Action<any,any>[], tag: Symbol);

        unsuppress(action: Action<any,any>, tag: Symbol);
        unsuppress(actions: Action<any,any>[], tag: Symbol);
    }

    // EXECUTOR
    // --------------------------------------------------------------------------------------------
    export interface ExecutionOptions {
        readonly authOptions?   : any;
        readonly daoOptions?    : DaoOptions;
        readonly rateLimits?    : RateOptions;
        readonly defaultInputs? : any;
    }

    export interface ExecutorContext {
        readonly authenticator? : Authenticator<any,any>;
        readonly database       : Database;
        readonly cache?         : Cache;
        readonly dispatcher?    : Dispatcher;
        readonly notifier?      : Notifier;
        readonly limiter?       : RateLimiter;
        readonly rateLimits?    : RateOptions;
        readonly logger?        : Logger; 
        readonly settings?      : any;
    }

    export class Executor<V,T> {

        readonly action         : Action<V,T>;
        readonly authenticator? : Authenticator<any,any>;
        readonly logger?        : Logger;

        constructor(context: ExecutorContext, action: Action<V,T>, adapter?: ActionAdapter<V>, options?: ExecutionOptions);

        execute(inputs: any, requetor?: RequestorInfo, timestamp?: number): Promise<T>;
    }

    // AUTHENTICATOR
    // --------------------------------------------------------------------------------------------
    export interface Authenticator<V,T> {
        decode(inputs: AuthInputs): V;
        toOwner(authResult: V | T): string;
        authenticate(this: ActionContext, requestor: AuthRequestor<V>, options: any): Promise<T>;
    }

    export interface AuthInputs {
        readonly scheme     : string;
        readonly credentials: string;
    }

    export interface AuthRequestor<V> {
        readonly auth       : V;
        readonly ip?        : string;
    }

    // DATABASE
    // --------------------------------------------------------------------------------------------
    export interface Database {
        connect(options?: DaoOptions): Promise<Dao>;
    }

    export interface DaoOptions {
        startTransaction: boolean;
    }

    export interface Dao {
        isActive: boolean;
        inTransaction: boolean;
        close(action?: 'commit' | 'rollback'): Promise<any>;
    }

    // CACHE
    // --------------------------------------------------------------------------------------------
    export interface Cache {
        get(key: string): Promise<any>;
        get(keys: string[]): Promise<any[]>;

        set(key: string, value: any, expires?: number);
        execute(script: string, keys: string[], params: any[]): Promise<any>;

        clear(key: string);
        clear(keys: string[]);
    }

    // DISPATCHER
    // --------------------------------------------------------------------------------------------
    export interface QueueMessage {
        id      : string;
        queue   : string;
        receipt?: string;
        payload : any;
        received: number;
        expires : number;
        sentOn  : number;
    }

    export interface QueueMessageOptions {
        delay?  : number;
        ttl?    : number;
    }

    export interface Dispatcher {
        sendMessage(queue: string, payload: any, options?: QueueMessageOptions, callback?: (error?: Error) => void);
        receiveMessage(queue: string, callback: (error: Error, message: QueueMessage) => void);
        deleteMessage(message: QueueMessage, callback?: (error?: Error) => void);
    }

    export interface Task {
        queue   : string;
        payload : any;
        delay?  : number;

        merge(task: Task): Task;
    }

    // NOTIFIER
    // --------------------------------------------------------------------------------------------
    export interface Notifier {
        send(notice: Notice): Promise<any>;
        send(notices: Notice[]): Promise<any>;
    }

    export interface Notice {
        target  : string;
        topic?  : string;
        event   : string;
        payload : any;

        merge(notice: Notice): Notice;
    }

    export interface NoticeFilter {
        target? : string;
        topic?  : string;
        event?  : string;
    }

    // RATE LIMITER
    // --------------------------------------------------------------------------------------------
    export interface RateLimiter {
        try(id: string, options: RateOptions): Promise<any>;
    }

    export interface RateOptions {
        window  : number;
        limit   : number;
    }

    // LOGGER
    // --------------------------------------------------------------------------------------------
    export interface Logger {        
        debug(message: string, source?: string);
        info(message: string, source?: string);
        warn(message: string, source?: string);

        error(error: Error);

        log(event: string, properties?: { [key: string]: any });
        track(metric: string, value: number);
        trace(source: string, command: string, time: number, success?: boolean);

        request(request: http.IncomingMessage, response: http.ServerResponse);
    }

    // HTTP STATUS CODES
    // --------------------------------------------------------------------------------------------
    export const enum HttpStatusCode {
        OK                  = 200,
        Created             = 201,
        Accepted            = 202,
        NoContent           = 204,
        BadRequest          = 400,
        Unauthorized        = 401,
        InvalidInputs       = 402,
        Forbidden           = 403,
        NotFound            = 404,
        NotAllowed          = 405,
        NotAcceptable       = 406,
        UnsupportedContent  = 415,
        NotReady            = 425,
        TooManyRequests     = 429,
        InternalServerError = 500,
        NotImplemented      = 501,
        ServiceUnavailable  = 503
    }

    // ERRORS
    // --------------------------------------------------------------------------------------------
    export interface ExceptionOptions {
        status?     : number;
        message?    : string;
        code?       : number;
        cause?      : Error;
        stackStart? : Function;
        allowCommit?: boolean;
    }

    export type ErrorDescriptor = [number, string];

    export class Exception extends Error {
        name        : string;
        status      : number;
        headers?    : { [index: string]: string };
        code?       : number;
        cause?      : Error;

        constructor(options: ExceptionOptions);
        constructor(message: string, status?: number);

        isClientError: boolean;
        isServerError: boolean; 
    }

    export class TooBusyError extends Exception {
        constructor(message?: string);
    }

    export class InvalidEndpointError extends Exception {
        constructor(path: string);
    }

    export class UnsupportedMethodError extends Exception {
        constructor(method: string, path: string);
    }

    // VALIDATOR
    // --------------------------------------------------------------------------------------------
    export interface Validator {
        <T>(value: T, message?: string): T;

        request<T>      (value: T, code?: number): T;
        request<T>      (value: T, message?: string, code?: number): T;
        request<T>      (value: T, descriptor: [number, string]): T;

        input<T>        (value: T, message?: string): T;
        authorized<T>   (value: T, message?: string): T;
        exists<T>       (value: T, message?: string): T;
    }

    export const validate: Validator;

    // UTILITIES
    // --------------------------------------------------------------------------------------------
    export interface Comparator<T> {
        (v1: T, v2: T): boolean;
    }

    export interface Utilities {
        since       : (start: number[]) => number;
        wrap        : (error: Error, message: string) => Error;
        isError     : (value: any) => value is Error;
        arrays: {
            clean<T>(a1: T[]): T[];
            areEqual<T>(a1: T[], a2: T[], strict?: boolean, comparator?: Comparator<T>): boolean;
        };
        parse: {
            int(value: string | number, min?: number, max?: number): number;
            number(value: string | number, min?: number, max?: number): number;
            date(value: string | number): Date;
            boolean(value: any, strict?: boolean): boolean;
            string(value: any, minLength?: number, maxLength?: number): string;
        };        
    }

    export const util: Utilities;
}
declare module "nova-base" {

    // ACTION
    // --------------------------------------------------------------------------------------------
    export interface Action<V,T> {
        (this: ActionContext, inputs: V): Promise<T>
    }
        
    export interface ActionAdapter<V> {
        (this: ActionContext, inputs: any, authInfo?: any): Promise<V>
    }

    export interface ActionContext {
        dao     : Dao;
        cache   : Cache;
        settings: any;

        register(task: Task);
        register(notice: Notice);

        clear(filter: NoticeFilter);

        invalidate(key: string);
        isInvalid(key: string): boolean;

        run<V,T>(action: Action<V,T>, inputs: V): Promise<T>;
    }

    // EXECUTOR
    // --------------------------------------------------------------------------------------------
    export interface ExecutionOptions {
        daoOptions?     : DaoOptions;
        rateOptions?    : RateOptions;
        authOptions?    : any;
    }

    export interface ExecutorContext {
        authenticator   : Authenticator;
        database        : Database;
        cache           : Cache;
        dispatcher      : Dispatcher;
        notifier        : Notifier;
        limiter?        : RateLimiter;
        logger?         : Logger; 
        settings?       : any;
    }

    export class Executor<V,T> {

        action: Action<V,T>;

        constructor(context: ExecutorContext, action: Action<V,T>, adapter?: ActionAdapter<V>, options?: ExecutionOptions);
        execute(inputs: any, requetor?: AuthInputs | string): Promise<T>;
    }

    // AUTHENTICATOR
    // --------------------------------------------------------------------------------------------
    export interface Authenticator {
        (inputs: AuthInputs, options: any): Promise<any>;

        toOwner?: (authResult: any) => string;
    }

    export interface AuthInputs {
        scheme      : string;
        credentials : string;
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
        release(action?: 'commit' | 'rollback'): Promise<any>;
    }

    // CACHE
    // --------------------------------------------------------------------------------------------
    export interface Cache {
        get(key: string): Promise<any>;
        get(keys: string[]): Promise<any[]>;

        set(key: string, value: any, expires?: number);
        execute(script: string, keys: string[], parameters: any[]): Promise<any>;

        clear(key: string);
        clear(keys: string[]);
    }

    // DISPATCHER
    // --------------------------------------------------------------------------------------------
    export interface Dispatcher {
        dispatch(task: Task): Promise<any>;
        dispatch(tasks: Task[]): Promise<any>;
    }

    export interface Task {
        queue   : string;
        payload : any;
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
        scope?  : RateScope;
    }

    export const enum RateScope {
        Local = 1, Global = 2
    }

    // LOGGER
    // --------------------------------------------------------------------------------------------
    export interface Logger {        
        debug(message: string);
        info(message: string);
        warn(message: string);

        error(error: Error);

        log(event: string, properties?: { [key: string]: any });
        track(metric: string, value: number);
        trace(service: string, command: string, time: number, success?: boolean);
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
    }

    export class Exception extends Error {
        name    : string;
        status  : number;
        code?   : number;
        cause?  : Error;

        constructor(options: ExceptionOptions);
        constructor(message: string, status: number);

        isClientError: boolean;
        isServerError: boolean; 
    }

    export class TooBusyError extends Exception {
        constructor(message?: string);
    }

    // VALIDATOR
    // --------------------------------------------------------------------------------------------
    export interface BaseValidator {
        (condition: any, message: string): void;
        from?: (error: Error, mesage?: string) => void;
    }

    interface DescriptorValidator {
        (condition: any, message: string): void;
        (condition: any, descriptor: [number, string]): void;

        from?: (error: Error, messageOrDescriptor?: string | [number, string]) => void;
    }

    export interface Validator extends BaseValidator {
        request?    : DescriptorValidator;
        authorized? : BaseValidator;
        inputs?     : BaseValidator;
        exists?     : BaseValidator;
        content?    : BaseValidator;
        accepts?    : BaseValidator;
        allowed?    : BaseValidator;
        ready?      : BaseValidator;
    }

    export const validate: Validator;

    // UTILITIES
    // --------------------------------------------------------------------------------------------
    export const util: {
        since   : (start: number[]) => number;
        wrap    : (error: Error, message: string) => Error;
    };
}
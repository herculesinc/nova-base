declare module "nova-core" {

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
        logger  : Logger;
        settings: any;

        register(task: Task);
        register(notice: Notice);

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
        constructor(context: ExecutorContext, action: Action<V,T>, adapter: ActionAdapter<V>, options: ExecutionOptions);
        execute(inputs: any, requetor?: AuthInputs | string): Promise<T>;
    }

    // AUTHENTICATOR
    // --------------------------------------------------------------------------------------------
    export interface Authenticator {
        (inputs: AuthInputs, options: any): Promise<any>
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
        prefix(prefix: string): Cache;

        get(key: string): Promise<any>;
        getAll(keys: string[]): Promise<any[]>;
        set(key: string, value: any, expires?: number);


        update(key: string, field: string, value: any);

        execute(script: string, keys: string[], parameters: any[]): Promise<any>;
        clear(keyOrKeys: string | string[]);
    }

    // DISPATCHER
    // --------------------------------------------------------------------------------------------
    export interface Dispatcher {
        dispatch(taksOrTasks: Task | Task[]): Promise<any>;
    }

    export interface Task {
        queue: string;   
        merge(task: Task): Task;
    }

    // NOTIFIER
    // --------------------------------------------------------------------------------------------
    export interface Notifier {
        send(noticeOrNotices: Notice | Notice[]): Promise<any>;
    }

    export interface Notice {
        channel : string;
        event   : string;
        merge(notice: Notice): Notice;
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
        debug(message: string);
        info (message: string);
        warn(message: string);

        error(error: Error);

        log(event: string, properties?: { [key: string]: any });
        track(metric: string, value: number);
        trace(service: string, command: string, time: number, success?: boolean);
    }
}
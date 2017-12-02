declare module "nova" {

    export function getContext(): Operation;

    // OPERATION
    // --------------------------------------------------------------------------------------------
    export interface Operation {
        readonly id         : string;
        readonly name       : string;

        readonly requestor  : Requestor;

        readonly log        : Logger;
        readonly dao        : Dao;
        readonly cache      : Cache;

        readonly startTs    : number;
        readonly endTs?     : number;

        defer<V,T>(action: Action<V,T>, inputs: V): void;

        notify(target: string, notice: Notice, immediate?: boolean);
        dispatch(task: Task, immediate?: boolean);
    }

    export interface Requestor {
        ip      : string;
        id      : string;
    }

    // ACTION
    // --------------------------------------------------------------------------------------------
    export interface Action<V,T> {
        (inputs: V): Promise<T>;
    }

    // DATABASE
    // --------------------------------------------------------------------------------------------
    export interface Database {
        connect(options?: DaoOptions): Promise<Dao>;
    }

    export interface DaoOptions {
        readonly: boolean;
    }

    export interface Dao {
        isActive    : boolean;
        isReadOnly  : boolean;
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
    export interface Dispatcher {
        send(task: Task): Promise<any>;
        send(tasks: Task[]): Promise<any>;
    }

    export interface Task {
        queue   : string;
        payload : any;
        delay?  : number;
        ttl?    : number;

        merge(task: Task): Task;
    }

    // NOTIFIER
    // --------------------------------------------------------------------------------------------
    export interface Notifier {
        send(target: string, notice: Notice): Promise<any>;
        send(target: string, notices: Notice[]): Promise<any>;
    }

    export interface Notice {
        event   : string;
        payload : any;

        merge(notice: Notice): Notice;
    }

        // LOGGER
    // --------------------------------------------------------------------------------------------
    export interface TraceSource {
        name    : string;
        type    : 'http' | 'sql';
    }

    export interface Logger {        
        debug(message: string, source?: string);
        info(message: string, source?: string);
        warn(message: string, source?: string);

        error(error: Error);

        track(metric: string, value: number);
        trace(source: TraceSource, command: string, data: string, duration: number, success?: boolean);
    }
}
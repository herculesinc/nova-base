// IMPORTS
// ================================================================================================
import { since, HttpCodeNames } from './lib/util';

// INTERFACES
// ================================================================================================

// AUTHENTICATOR
// ------------------------------------------------------------------------------------------------
export interface Authenticator {
    (inputs: AuthInputs, options: any): Promise<any>
}

export interface AuthInputs {
    scheme      : string;
    credentials : string;
}

// DATABASE
// ------------------------------------------------------------------------------------------------
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
// ------------------------------------------------------------------------------------------------
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
// ------------------------------------------------------------------------------------------------
export interface Dispatcher {
    dispatch(taksOrTasks: Task | Task[]): Promise<any>;
}

export interface Task {
    queue: string;   
    merge(task: Task): Task;
}

// NOTIFIER
// ------------------------------------------------------------------------------------------------
export interface Notifier {
    send(noticeOrNotices: Notice | Notice[]): Promise<any>;
}

export interface Notice {
    target  : string;
    event   : string;
    merge(notice: Notice): Notice;
}

export interface NoticeFilter {
    target? : string;
    event?  : string;
}

// RATE LIMITER
// ------------------------------------------------------------------------------------------------
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
// ------------------------------------------------------------------------------------------------
export interface Logger {        
    debug(message: string);
    info(message: string);
    warn(message: string);

    error(error: Error);

    log(event: string, properties?: { [key: string]: any });
    track(metric: string, value: number);
    trace(service: string, command: string, time: number, success?: boolean);
}

// MODULE VARIABLES
// =================================================================================================
export const util = {
    since: since
}

// RE-EXPORTS
// =================================================================================================
export { Executor } from './lib/Executor';
export { validate } from './lib/validator';
export { ClientError, InternalServerError } from './lib/errors';
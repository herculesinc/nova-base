// IMPORTS
// ================================================================================================
import * as http from 'http';
import { since, HttpCodeNames } from './lib/util';
import { wrapMessage } from './lib/errors';

// INTERFACES
// ================================================================================================

// AUTHENTICATOR
// ------------------------------------------------------------------------------------------------
export interface Authenticator {
    (inputs: AuthInputs, options: any): Promise<any>;

    toOwner?: (authResult: any) => string;
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
    isActive        : boolean;
    inTransaction   : boolean;

    release(action?: 'commit' | 'rollback'): Promise<any>;
}

// CACHE
// ------------------------------------------------------------------------------------------------
export interface Cache {
    get(key: string): Promise<any>;
    get(keys: string[]): Promise<any[]>;

    set(key: string, value: any, expires?: number);
    execute(script: string, keys: string[], parameters: any[]): Promise<any>;
    
    clear(key: string);
    clear(keys: string[]);
}

// DISPATCHER
// ------------------------------------------------------------------------------------------------
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
// ------------------------------------------------------------------------------------------------
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
// ------------------------------------------------------------------------------------------------
export interface RateLimiter {
    try(id: string, options: RateOptions): Promise<any>;
}

export interface RateOptions {
    window  : number;
    limit   : number;
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

    request(request: http.IncomingMessage, response: http.ServerResponse);
}

// MODULE VARIABLES
// =================================================================================================
export const util = {
    since   : since,
    wrap    : wrapMessage
};

// RE-EXPORTS
// =================================================================================================
export { Executor } from './lib/Executor';
export { validate } from './lib/validator';
export { Exception, TooBusyError, InvalidEndpointError, UnsupportedMethodError } from './lib/errors';
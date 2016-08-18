// IMPORTS
// ================================================================================================
import {
    Database, Dao, DaoOptions, Cache, Authenticator, AuthInputs, Dispatcher, Notifier, Logger,
    RateLimiter, RateOptions
} from './../index';
import { Action, ActionContext, ActionAdapter } from './Action';
import { Exception, wrapMessage } from './errors';
import { validate } from './validator';
import { since, noop } from './util';

// INTERFACES
// ================================================================================================
export interface ExecutionOptions {
    authOptions?    : any;
	daoOptions?     : DaoOptions;
    rateLimits?     : RateOptions;
}

export interface ExecutorContext {
    authenticator?  : Authenticator;
    database        : Database;
    cache?          : Cache;
    dispatcher?     : Dispatcher;
    notifier?       : Notifier;
    limiter?        : RateLimiter;
    rateLimits?     : RateOptions;
    logger?         : Logger;
    settings?       : any;
}

interface RateLimits {
    local?          : RateOptions;
    global?         : RateOptions;
}

// CLASS DEFINITION
// ================================================================================================
export class Executor<V,T> {

    authenticator?  : Authenticator;
    database        : Database;
    cache           : Cache;
    dispatcher?     : Dispatcher;
    notifier?       : Notifier;
    limiter?        : RateLimiter;
    logger          : Logger;
    settings?       : any;

    action          : Action<V,T>;
    adapter?        : ActionAdapter<V>;

    authOptions?    : any;
    daoOptions?     : DaoOptions;
    rateLimits?     : RateLimits;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(context: ExecutorContext, action: Action<V,T>, adapter?: ActionAdapter<V>, options?: ExecutionOptions) {

        // validate inputs
        validateContext(context, options);
        validateAction(action);
        if (adapter) validateAdapter(adapter);

        // initialize instance variables
        this.authenticator  = context.authenticator;
        this.database       = context.database;
        this.cache          = context.cache || errCache;
        this.dispatcher     = context.dispatcher;
        this.notifier       = context.notifier;
        this.limiter        = context.limiter;
        this.logger         = context.logger || noopLogger;
        this.settings       = context.settings;

        this.action         = action;
        this.adapter        = adapter;

        if (context.rateLimits) {
            this.rateLimits = { global: context.rateLimits };
        }

        if (options) {
            this.authOptions    = options.authOptions;
            this.daoOptions     = options.daoOptions;

            if (options.rateLimits){
                this.rateLimits = Object.assign({}, this.rateLimits, { local: options.rateLimits });
            }
        }
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    async execute(inputs: any, requestor?: AuthInputs | string): Promise<T> {
        var dao: Dao, authInfo: any;
        const start = process.hrtime();

        try {
            this.logger.debug(`Executing ${this.action.name} action`);

            // enforce rate limit
            if (this.rateLimits && requestor) {
                const key = (typeof requestor !== 'string')
                    ? `${requestor.scheme}::${requestor.credentials}` : requestor;

                const localTry = this.rateLimits.local
                    ? this.limiter.try(`${key}::${this.action.name}`, this.rateLimits.local)
                    : undefined;

                const globalTry = this.rateLimits.global
                    ? this.limiter.try(key, this.rateLimits.global) 
                    : undefined;

                await Promise.all([localTry, globalTry]);
            }

            // open database connection, create context, and authenticate action if needed
            dao = await this.database.connect(this.daoOptions);
            const context = new ActionContext(dao, this.cache, this.logger, this.settings, !!this.dispatcher, !!this.notifier);
            if (typeof requestor !== 'string') {
                validate(this.authenticator, 'Cannot authenticate: authenticator is undefined');
                authInfo = await this.authenticator.call(context, requestor, this.authOptions);
            }

            // execute action and release database connection
            inputs = this.adapter ? await this.adapter.call(context, inputs, authInfo) : inputs;
            let result: T | Error;
            try {
                result = await this.action.call(context, inputs);
            }
            catch (error) {
                // if the error allows for the execution to be completed, don't throw it now
                if (!(error instanceof Exception) || !(error as Exception).allowCommit) throw error;
                result = error;
            }
            await dao.close(dao.inTransaction ? 'commit' : undefined);

            // invalidate cache items
            if (context.keys.size > 0) {
                this.cache.clear(Array.from(context.keys));
            }

            // send out tasks and notices
            const taskPromise = (this.dispatcher) ? this.dispatcher.dispatch(context.tasks) : undefined;
            const noticePromise = (this.notifier) ? this.notifier.send(context.notices) : undefined;
            await Promise.all([taskPromise, noticePromise]);

            // log executiong time and return the result
            this.logger.log(`Executed ${this.action.name} action`, { time: since(start) });

            // if result is not an error, return it
            if (result instanceof Error) throw result;
            return result;
        }
        catch (error) {
            // if DAO connection is open, close it
            if (dao && dao.isActive) {
                await dao.close(dao.inTransaction ? 'rollback' : undefined);
            }

            // update the error message (if needed), and rethrow the error
            if (!(error instanceof Exception) || !(error as Exception).allowCommit) {
                error = wrapMessage(error, `Failed to execute ${this.action.name} action`);
            }
            return Promise.reject<any>(error);
        }
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function validateContext(context: ExecutorContext, options: ExecutionOptions) {

    if (!context) throw new TypeError('Cannot create an Executor: context is undefined');

    // authenticator
    if (context.authenticator) {
        if (typeof context.authenticator !== 'function') throw new TypeError('Cannot create an Executor: Authenticator is invalid');
    }
    else {
        if (options && options.authOptions) throw new TypeError('Cannot create an Executor: Authenticator was not provided');
    }
    
    // database
    if (!context.database) throw new TypeError('Cannot create an Executor: Database is undefined');
    if (typeof context.database.connect !== 'function') throw new TypeError('Cannot create an Executor: Database is invalid');

    // cache
    if (context.cache) {
        if (typeof context.cache.get !== 'function') throw new TypeError('Cannot create an Executor: Cache is invalid');
        if (typeof context.cache.set !== 'function') throw new TypeError('Cannot create an Executor: Cache is invalid');
        if (typeof context.cache.execute !== 'function') throw new TypeError('Cannot create an Executor: Cache is invalid');
        if (typeof context.cache.clear !== 'function') throw new TypeError('Cannot create an Executor: Cache is invalid');
    }

    // dispatcher
    if (context.dispatcher) {
        if (typeof context.dispatcher.dispatch !== 'function') throw new TypeError('Cannot create an Executor: Dispatcher is invalid');
    }

    // notifier
    if (context.notifier) {
        if (typeof context.notifier.send !== 'function') throw new TypeError('Cannot create an Executor: Notifier is invalid');
    }

    // rate limiter
    if (context.limiter) {
        if (typeof context.limiter.try !== 'function') throw new TypeError('Cannot create an Executor: Rate Limiter is invalid');
    }
    else {
        if (options && options.rateLimits) throw new TypeError('Cannot create an Executor: Rate Limiter was not provided');
    }

    if (context.logger) {
        if (typeof context.logger.debug !== 'function') throw new TypeError('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.info !== 'function') throw new TypeError('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.warn !== 'function') throw new TypeError('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.error !== 'function') throw new TypeError('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.log !== 'function') throw new TypeError('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.track !== 'function') throw new TypeError('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.trace !== 'function') throw new TypeError('Cannot create an Executor: Logger is invalid');
    }
}

export function validateAction(value: any) {
    if (!value) throw new TypeError('Cannot create an Executor: Action is undefined');
    if (typeof value !== 'function') throw new TypeError('Cannot create an Executor: Action is not a function');
}

export function validateAdapter(value: any) {
    if (typeof value !== 'function') throw new TypeError('Cannot create an Executor: Adapter is not a function');
}

// DUMMY COMPONENTS
// =================================================================================================
const noopLogger: Logger = {
    debug   : noop,
    info    : noop,
    warn    : noop,
    error   : noop,
    log     : noop,
    track   : noop,
    trace   : noop,
    request : noop
};

const errCache: Cache = {
    get(keyOrKeys: string | string[]): Promise<any> { 
        throw new Exception(`Cannot use cache: cache hasn't been initialized`); 
    },
    set(key: string, value: any, expires?: number) { 
        throw new Exception(`Cannot use cache: cache hasn't been initialized`);
    },
    execute(script: string, keys: string[], parameters: any[]): Promise<any> {
        throw new Exception(`Cannot use cache: cache hasn't been initialized`);
    },
    clear(keyOrKeys: string | string[]) {
        throw new Exception(`Cannot use cache: cache hasn't been initialized`);
    }
};
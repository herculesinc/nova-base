// IMPORTS
// ================================================================================================
import {
    Database, Dao, DaoOptions, Cache, Authenticator, AuthInputs, Dispatcher, Notifier, Logger,
    RateLimiter, RateOptions, RateScope
} from './../index';
import { Action, ActionContext, ActionAdapter } from './Action';
import { wrapMessage } from './errors';
import { since } from './util';

// INTERFACES
// ================================================================================================
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

// CLASS DEFINITION
// ================================================================================================
export class Executor<V,T> {

    authenticator   : Authenticator;
    database        : Database;
    cache           : Cache;
    dispatcher      : Dispatcher;
    notifier        : Notifier;
    limiter?        : RateLimiter;
    logger?         : Logger;
    settings?       : any;

    action          : Action<V,T>;
    adapter?        : ActionAdapter<V>;

    daoOptions?     : DaoOptions;
    rateOptions?    : RateOptions;
    authOptions?    : any;

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
        this.cache          = context.cache;
        this.dispatcher     = context.dispatcher;
        this.notifier       = context.notifier;
        this.limiter        = context.limiter;
        this.logger         = context.logger;
        this.settings       = context.settings;

        this.action         = action;
        this.adapter        = adapter;

        if (options) {
            this.daoOptions     = options.daoOptions;
            this.rateOptions    = options.rateOptions;
            this.authOptions    = options.authOptions;
        }
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    async execute(inputs: any, requestor?: AuthInputs | string): Promise<T> {
        var dao: Dao, authInfo: any;
        const start = process.hrtime();

        try {
            this.logger && this.logger.debug(`Executing ${this.action.name} action`);

            // enforce rate limit
            if (this.rateOptions && requestor) {
                const scope: RateScope = this.rateOptions.scope || RateScope.Global;

                const key = (typeof requestor !== 'string')
                    ? `${requestor.scheme}::${requestor.credentials}` : requestor;

                const localTry = (scope & RateScope.Local)
                    ? this.limiter.try(`${key}::${this.action.name}`, this.rateOptions) : undefined;

                const globalTry = (scope & RateScope.Global)
                    ? this.limiter.try(key, this.rateOptions) : undefined;

                await Promise.all([localTry, globalTry]);
            }

            // open database connection, create context, and authenticate action if needed
            dao = await this.database.connect(this.daoOptions);
            const context = new ActionContext(dao, this.cache, this.logger, this.settings);
            if (typeof requestor !== 'string') {
                authInfo = await this.authenticator.call(context, requestor, this.authOptions);
            }

            // execute action and release database connection
            inputs = this.adapter ? await this.adapter.call(context, inputs, authInfo) : inputs;
            const result: T = await this.action.call(context, inputs);
            await dao.release(dao.inTransaction ? 'commit' : undefined);

            // invalidate cache items
            if (context.keys.size > 0) {
                this.cache.clear(Array.from(context.keys));
            }

            // send out tasks and notices
            const taskPromise = this.dispatcher.dispatch(context.tasks);
            const noticePromise = this.notifier.send(context.notices);
            await Promise.all([taskPromise, noticePromise]);

            // log executiong time and return the result
            this.logger && this.logger.log(`Executed ${this.action.name}`, { time: since(start) });
            return result;
        }
        catch (error) {
            // if DAO connection is open, close it
            if (dao && dao.isActive) {
                await dao.release(dao.inTransaction ? 'rollback' : undefined);
            }

            // update the error message, and rethrow the error
            error = wrapMessage(error, `Failed to execute ${this.action.name} action`);
            return Promise.reject<any>(error);
        }
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function validateContext(context: ExecutorContext, options: ExecutionOptions) {

    if (!context) throw new Error('Cannot create an Executor: context is undefined');

    // authenticator
    if (!context.authenticator) throw new Error('Cannot create an Executor: Authenticator is undefined');
    if (typeof context.authenticator !== 'function') throw new TypeError('Cannot create an Executor: Authenticator is invalid');

    // database
    if (!context.database) throw new Error('Cannot create an Executor: Database is undefined');
    if (typeof context.database.connect !== 'function') throw new TypeError('Cannot create an Executor: Database is invalid');

    // cache
    if (!context.cache) throw new Error('Cannot create an Executor: Cannot create an Executor: Cache is undefined');
    if (typeof context.cache.get !== 'function') throw new TypeError('Cannot create an Executor: Cache is invalid');
    if (typeof context.cache.set !== 'function') throw new TypeError('Cannot create an Executor: Cache is invalid');
    if (typeof context.cache.execute !== 'function') throw new TypeError('Cannot create an Executor: Cache is invalid');
    if (typeof context.cache.clear !== 'function') throw new TypeError('Cannot create an Executor: Cache is invalid');

    // dispatcher
    if (!context.dispatcher) throw new Error('Cannot create an Executor: Dispatcher is undefined');
    if (typeof context.dispatcher.dispatch !== 'function') throw new TypeError('Cannot create an Executor: Dispatcher is invalid');

    // notifier
    if (!context.notifier) throw new Error('Cannot create an Executor: Notifier is undefined');
    if (typeof context.notifier.send !== 'function') throw new TypeError('Cannot create an Executor: Notifier is invalid');

    // rate limiter
    if (context.limiter) {
        if (typeof context.limiter.try !== 'function') throw new TypeError('Cannot create an Executor: Rate Limiter is invalid');
    }
    else {
        if (options && options.rateOptions) throw new Error('Cannot create an Executor: Rate Limiter was not provided')
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
    if (!value) throw new Error('Cannot create an Executor: Action is undefined');
    if (typeof value !== 'function') throw new TypeError('Cannot create an Executor: Action is not a function');
}

export function validateAdapter(value: any) {
    if (typeof value !== 'function') throw new TypeError('Cannot create an Executor: Adapter is not a function');
}

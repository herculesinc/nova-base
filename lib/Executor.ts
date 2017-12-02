// IMPORTS
// ================================================================================================
import {
    Database, Dao, DaoOptions, Cache, Authenticator, AuthInputs, Dispatcher, Task, Notifier, Notice, 
    Logger, RateLimiter, RateOptions
} from './../index';
import { Action, ActionContext, ActionAdapter } from './Action';
import { Exception, wrapMessage } from './errors';
import { validate } from './validator';
import { since, noop } from './util';

// INTERFACES
// ================================================================================================
export interface RequestorInfo {
    readonly ip?    : string;
    readonly auth?  : any;
}

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
}

interface RateLimits {
    readonly local?         : RateOptions;
    readonly global?        : RateOptions;
}

// CLASS DEFINITION
// ================================================================================================
export class Executor<V,T> {

    readonly authenticator? : Authenticator<any,any>;
    readonly database       : Database;
    readonly cache          : Cache;
    readonly dispatcher?    : Dispatcher;
    readonly notifier?      : Notifier;
    readonly limiter?       : RateLimiter;
    readonly logger         : Logger;

    readonly action         : Action<V,T>;
    readonly adapter?       : ActionAdapter<V>;

    readonly authOptions?   : any;
    readonly daoOptions?    : DaoOptions;
    readonly rateLimits?    : RateLimits;
    readonly defaultInputs? : any;

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

        this.action         = action;
        this.adapter        = adapter;

        if (context.rateLimits) {
            this.rateLimits = { global: context.rateLimits };
        }

        if (options) {
            this.authOptions    = options.authOptions;
            this.daoOptions     = options.daoOptions;
            this.defaultInputs  = options.defaultInputs;

            if (options.rateLimits){
                this.rateLimits = { ...this.rateLimits, ...{ local: options.rateLimits } };
            }
        }
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    async execute(inputs: any, requestor?: RequestorInfo, timestamp?: number): Promise<T> {
        let dao: Dao, authInfo: any, authRequired: any;
        let actionCompleted = false;
        const start = process.hrtime();

        try {
            this.logger.debug(`Executing ${this.action.name} action`);

            // make sure request can be authenticated if needed
            if (requestor && requestor.auth) {
                validate(this.authenticator, 'Cannot authenticate: authenticator is undefined');
                authRequired = true;
            }

            // enforce rate limit
            if (this.rateLimits && requestor) {
                const key = (authRequired ? this.authenticator.toOwner(requestor.auth) : requestor.ip);

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
            const context = new ActionContext(dao, this.cache, this.logger, !!this.dispatcher, !!this.notifier, timestamp);
            if (authRequired) {
                authInfo = await this.authenticator.authenticate.call(context, requestor, this.authOptions);
            }

            // execute action and release database connection
            if (this.defaultInputs) {
                inputs = { ...this.defaultInputs, ...inputs };
            }

            if (this.adapter) {
                inputs = await this.adapter.call(context, inputs, authInfo, requestor && requestor.ip);
            }
            
            const result: T | Error = await this.action.call(context, inputs);
            await dao.close(dao.inTransaction ? 'commit' : undefined);

            // seal the context to prohibit addition of deferred actions
            context.sealed = true;

            // execute deferred actions
            const deferredActionPromises = [];
            if (context.deferred.length) {
                this.logger.log(`Executing ${context.deferred.length} deferred actions`);
                for (let dae of context.deferred) {
                    deferredActionPromises.push(dae.action.call(context, dae.inputs));
                }
                await Promise.all(deferredActionPromises);
            }

            // invalidate cache items
            if (context.keys.size > 0) {
                this.cache.clear(Array.from(context.keys));
            }

            // send out tasks and notices
            const taskPromise = this.dispatchTasks(context.tasks);
            const noticePromise = this.sendNotices(context.notices);
            await Promise.all([taskPromise, noticePromise]);

            // log executiong time and return the result
            actionCompleted = true;
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
            if (!actionCompleted) {
                error = wrapMessage(error, `Failed to execute ${this.action.name} action`);
            }
            throw error;
        }
    }

    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    private dispatchTasks(tasks: Task[]): Promise<any> {
        if (!this.dispatcher) return undefined;
        if (!tasks || !tasks.length) return undefined;

        let taskPromises: Promise<any>[] = [];
        for (let task of tasks) {
            taskPromises.push(new Promise((resolve, reject) => {
                let options = { delay: task.delay };
                this.dispatcher.sendMessage(task.queue, task.payload, options, function(error) {
                    if (error) {
                        return reject(error);
                    }

                    resolve();
                });
            }));
        }

        return Promise.all(taskPromises);
    }

    private sendNotices(notices: Notice[]): Promise<any> {
        if (!this.notifier) return undefined;
        if (!notices || !notices.length) return undefined;
        return this.notifier.send(notices);
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function validateContext(context: ExecutorContext, options: ExecutionOptions) {

    if (!context) throw new TypeError('Cannot create an Executor: context is undefined');

    // authenticator
    if (context.authenticator) {
        if (typeof context.authenticator.decode !== 'function') throw new TypeError('Cannot create an Executor: Authenticator is invalid');
        if (typeof context.authenticator.toOwner !== 'function') throw new TypeError('Cannot create an Executor: Authenticator is invalid');
        if (typeof context.authenticator.authenticate !== 'function') throw new TypeError('Cannot create an Executor: Authenticator is invalid');
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
        if (typeof context.dispatcher.sendMessage !== 'function') throw new TypeError('Cannot create an Executor: Dispatcher is invalid');
        if (typeof context.dispatcher.receiveMessage !== 'function') throw new TypeError('Cannot create an Executor: Dispatcher is invalid');
        if (typeof context.dispatcher.deleteMessage !== 'function') throw new TypeError('Cannot create an Executor: Dispatcher is invalid');
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
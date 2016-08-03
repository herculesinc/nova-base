"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const Action_1 = require('./Action');
const errors_1 = require('./errors');
const validator_1 = require('./validator');
const util_1 = require('./util');
// CLASS DEFINITION
// ================================================================================================
class Executor {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(context, action, adapter, options) {
        // validate inputs
        validateContext(context, options);
        validateAction(action);
        if (adapter)
            validateAdapter(adapter);
        // initialize instance variables
        this.authenticator = context.authenticator;
        this.database = context.database;
        this.cache = context.cache || errCache;
        this.dispatcher = context.dispatcher;
        this.notifier = context.notifier;
        this.limiter = context.limiter;
        this.logger = context.logger || noopLogger;
        this.settings = context.settings;
        this.action = action;
        this.adapter = adapter;
        if (context.rateLimits) {
            this.rateLimits = { global: context.rateLimits };
        }
        if (options) {
            this.authOptions = options.authOptions;
            this.daoOptions = options.daoOptions;
            if (options.rateLimits) {
                this.rateLimits = Object.assign({}, this.rateLimits, { local: options.rateLimits });
            }
        }
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    execute(inputs, requestor) {
        return __awaiter(this, void 0, void 0, function* () {
            var dao, authInfo;
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
                    yield Promise.all([localTry, globalTry]);
                }
                // open database connection, create context, and authenticate action if needed
                dao = yield this.database.connect(this.daoOptions);
                const context = new Action_1.ActionContext(dao, this.cache, this.logger, this.settings, !!this.dispatcher, !!this.notifier);
                if (typeof requestor !== 'string') {
                    validator_1.validate(this.authenticator, 'Cannot authenticate: authenticator is undefined');
                    authInfo = yield this.authenticator.call(context, requestor, this.authOptions);
                }
                // execute action and release database connection
                inputs = this.adapter ? yield this.adapter.call(context, inputs, authInfo) : inputs;
                let result;
                try {
                    result = yield this.action.call(context, inputs);
                }
                catch (error) {
                    // check if the error allows for the action to be completed
                    if (error instanceof errors_1.Exception && error.allowCommit) {
                        result = error;
                    }
                    else {
                        throw error;
                    }
                }
                yield dao.release(dao.inTransaction ? 'commit' : undefined);
                // invalidate cache items
                if (context.keys.size > 0) {
                    this.cache.clear(Array.from(context.keys));
                }
                // send out tasks and notices
                const taskPromise = (this.dispatcher) ? this.dispatcher.dispatch(context.tasks) : undefined;
                const noticePromise = (this.notifier) ? this.notifier.send(context.notices) : undefined;
                yield Promise.all([taskPromise, noticePromise]);
                // log executiong time and return the result
                this.logger.log(`Executed ${this.action.name} action`, { time: util_1.since(start) });
                // if result is not an error, return it
                if (result instanceof Error)
                    throw result;
                return result;
            }
            catch (error) {
                // if DAO connection is open, close it
                if (dao && dao.isActive) {
                    yield dao.release(dao.inTransaction ? 'rollback' : undefined);
                }
                // update the error message, and rethrow the error
                error = errors_1.wrapMessage(error, `Failed to execute ${this.action.name} action`);
                return Promise.reject(error);
            }
        });
    }
}
exports.Executor = Executor;
// HELPER FUNCTIONS
// ================================================================================================
function validateContext(context, options) {
    if (!context)
        throw new TypeError('Cannot create an Executor: context is undefined');
    // authenticator
    if (context.authenticator) {
        if (typeof context.authenticator !== 'function')
            throw new TypeError('Cannot create an Executor: Authenticator is invalid');
    }
    else {
        if (options && options.authOptions)
            throw new TypeError('Cannot create an Executor: Authenticator was not provided');
    }
    // database
    if (!context.database)
        throw new TypeError('Cannot create an Executor: Database is undefined');
    if (typeof context.database.connect !== 'function')
        throw new TypeError('Cannot create an Executor: Database is invalid');
    // cache
    if (context.cache) {
        if (typeof context.cache.get !== 'function')
            throw new TypeError('Cannot create an Executor: Cache is invalid');
        if (typeof context.cache.set !== 'function')
            throw new TypeError('Cannot create an Executor: Cache is invalid');
        if (typeof context.cache.execute !== 'function')
            throw new TypeError('Cannot create an Executor: Cache is invalid');
        if (typeof context.cache.clear !== 'function')
            throw new TypeError('Cannot create an Executor: Cache is invalid');
    }
    // dispatcher
    if (context.dispatcher) {
        if (typeof context.dispatcher.dispatch !== 'function')
            throw new TypeError('Cannot create an Executor: Dispatcher is invalid');
    }
    // notifier
    if (context.notifier) {
        if (typeof context.notifier.send !== 'function')
            throw new TypeError('Cannot create an Executor: Notifier is invalid');
    }
    // rate limiter
    if (context.limiter) {
        if (typeof context.limiter.try !== 'function')
            throw new TypeError('Cannot create an Executor: Rate Limiter is invalid');
    }
    else {
        if (options && options.rateLimits)
            throw new TypeError('Cannot create an Executor: Rate Limiter was not provided');
    }
    if (context.logger) {
        if (typeof context.logger.debug !== 'function')
            throw new TypeError('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.info !== 'function')
            throw new TypeError('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.warn !== 'function')
            throw new TypeError('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.error !== 'function')
            throw new TypeError('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.log !== 'function')
            throw new TypeError('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.track !== 'function')
            throw new TypeError('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.trace !== 'function')
            throw new TypeError('Cannot create an Executor: Logger is invalid');
    }
}
function validateAction(value) {
    if (!value)
        throw new TypeError('Cannot create an Executor: Action is undefined');
    if (typeof value !== 'function')
        throw new TypeError('Cannot create an Executor: Action is not a function');
}
exports.validateAction = validateAction;
function validateAdapter(value) {
    if (typeof value !== 'function')
        throw new TypeError('Cannot create an Executor: Adapter is not a function');
}
exports.validateAdapter = validateAdapter;
// DUMMY COMPONENTS
// =================================================================================================
const noopLogger = {
    debug: util_1.noop,
    info: util_1.noop,
    warn: util_1.noop,
    error: util_1.noop,
    log: util_1.noop,
    track: util_1.noop,
    trace: util_1.noop,
    request: util_1.noop
};
const errCache = {
    get(keyOrKeys) {
        throw new errors_1.Exception(`Cannot use cache: cache hasn't been initialized`);
    },
    set(key, value, expires) {
        throw new errors_1.Exception(`Cannot use cache: cache hasn't been initialized`);
    },
    execute(script, keys, parameters) {
        throw new errors_1.Exception(`Cannot use cache: cache hasn't been initialized`);
    },
    clear(keyOrKeys) {
        throw new errors_1.Exception(`Cannot use cache: cache hasn't been initialized`);
    }
};
//# sourceMappingURL=Executor.js.map
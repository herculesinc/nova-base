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
        this.cache = context.cache;
        this.dispatcher = context.dispatcher;
        this.notifier = context.notifier;
        this.limiter = context.limiter;
        this.logger = context.logger;
        this.settings = context.settings;
        this.action = action;
        this.adapter = adapter;
        if (options) {
            this.daoOptions = options.daoOptions;
            this.rateOptions = options.rateOptions;
            this.authOptions = options.authOptions;
        }
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    execute(inputs, requestor) {
        return __awaiter(this, void 0, void 0, function* () {
            var dao, authInfo;
            const start = process.hrtime();
            try {
                this.logger && this.logger.debug(`Executing ${this.action.name} action`);
                // enforce rate limit
                if (this.rateOptions && requestor) {
                    const scope = this.rateOptions.scope || 2 /* Global */;
                    const key = (typeof requestor !== 'string')
                        ? `${requestor.scheme}::${requestor.credentials}` : requestor;
                    const localTry = (scope & 1 /* Local */)
                        ? this.limiter.try(`${key}::${this.action.name}`, this.rateOptions) : undefined;
                    const globalTry = (scope & 2 /* Global */)
                        ? this.limiter.try(key, this.rateOptions) : undefined;
                    yield Promise.all([localTry, globalTry]);
                }
                // open database connection, create context, and authenticate action if needed
                dao = yield this.database.connect(this.daoOptions);
                const context = new Action_1.ActionContext(dao, this.cache, this.logger, this.settings);
                if (typeof requestor !== 'string') {
                    authInfo = yield this.authenticator.call(context, requestor, this.authOptions);
                }
                // execute action and release database connection
                inputs = this.adapter ? yield this.adapter.call(context, inputs, authInfo) : inputs;
                const result = yield this.action.call(context, inputs);
                yield dao.release(dao.inTransaction ? 'commit' : undefined);
                // invalidate cache items
                if (context.keys.size > 0) {
                    this.cache.clear(Array.from(context.keys));
                }
                // send out tasks and notices
                const taskPromise = this.dispatcher.dispatch(context.tasks);
                const noticePromise = this.notifier.send(context.notices);
                yield Promise.all([taskPromise, noticePromise]);
                // log executiong time and return the result
                this.logger && this.logger.log(`Executed ${this.action.name}`, { time: util_1.since(start) });
                return result;
            }
            catch (error) {
                // if DAO connection is open, close it
                if (dao && dao.isActive) {
                    yield dao.release(dao.inTransaction ? 'rollback' : undefined);
                }
                // update the error message, and rethrow the error
                error = errors_1.appendMessage(error, `Failed to execute ${this.action.name} action`);
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
        throw new Error('Cannot create an Executor: context is undefined');
    // authenticator
    if (!context.authenticator)
        throw new Error('Cannot create an Executor: Authentiator is undefined');
    if (typeof context.authenticator !== 'function')
        throw new Error('Cannot create an Executor: Authenticator is invalid');
    // database
    if (!context.database)
        throw new Error('Cannot create an Executor: Database is undefined');
    if (typeof context.database.connect !== 'function')
        throw new Error('Cannot create an Executor: Database is invalid');
    // cache
    if (!context.cache)
        throw new Error('Cannot create an Executor: Cannot create an Executor: Cache is undefined');
    if (typeof context.cache.get !== 'function')
        throw new Error('Cannot create an Executor: Cache is invalid');
    if (typeof context.cache.set !== 'function')
        throw new Error('Cannot create an Executor: Cache is invalid');
    if (typeof context.cache.execute !== 'function')
        throw new Error('Cannot create an Executor: Cache is invalid');
    if (typeof context.cache.clear !== 'function')
        throw new Error('Cannot create an Executor: Cache is invalid');
    // dispatcher
    if (!context.dispatcher)
        throw new Error('Cannot create an Executor: Dispatcher is undefined');
    if (typeof context.dispatcher.dispatch !== 'function')
        throw new Error('Cannot create an Executor: Dispatcher is invalid');
    // notifier
    if (!context.notifier)
        throw new Error('Cannot create an Executor: Notifier is undefined');
    if (typeof context.notifier.send !== 'function')
        throw new Error('Cannot create an Executor: Notifier is invalid');
    // rate limiter
    if (context.limiter) {
        if (typeof context.limiter.try !== 'function')
            throw new Error('Cannot create an Executor: Rate Limiter is invalid');
    }
    else {
        if (options && options.rateOptions)
            throw new Error('Cannot create an Executor: Rate Limiter was not provided');
    }
    if (context.logger) {
        if (typeof context.logger.debug !== 'function')
            throw new Error('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.info !== 'function')
            throw new Error('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.warn !== 'function')
            throw new Error('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.error !== 'function')
            throw new Error('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.log !== 'function')
            throw new Error('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.track !== 'function')
            throw new Error('Cannot create an Executor: Logger is invalid');
        if (typeof context.logger.trace !== 'function')
            throw new Error('Cannot create an Executor: Logger is invalid');
    }
}
function validateAction(value) {
    if (!value)
        throw new Error('Cannot create an Executor: Action is undefined');
    if (typeof value !== 'function')
        throw new Error('Cannot create an Executor: Action is not a function');
}
exports.validateAction = validateAction;
function validateAdapter(value) {
    if (typeof value !== 'function')
        throw new Error('Cannot create an Executor: Adapter is not a function');
}
exports.validateAdapter = validateAdapter;
//# sourceMappingURL=Executor.js.map
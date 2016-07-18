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
const util_1 = require('./util');
// CLASS DEFINITION
// ================================================================================================
class Executor {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(context, action, adapter, options) {
        // TODO: validate parameters
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
        this.daoOptions = options.daoOptions;
        this.rateOptions = options.rateOptions;
        this.authOptions = options.authOptions;
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
                if (this.rateOptions) {
                    const key = ''; // TODO: build key - add global vs. local options
                    yield this.limiter.try(key, this.rateOptions);
                }
                // open database connection, create context, and authenticate action if needed
                dao = yield this.database.connect(this.daoOptions);
                const context = new Action_1.ActionContext(dao, this.cache, this.logger, this.settings);
                if (typeof requestor !== 'string') {
                    authInfo = yield this.authenticator.call(this, requestor, this.authOptions);
                }
                // execute action and release database connection
                inputs = this.adapter ? yield this.adapter.call(context, inputs, authInfo) : inputs;
                const result = yield this.action.call(this, inputs);
                yield (dao.inTransaction ? dao.release('commit') : dao.release());
                // TODO: invalidate cache items
                // send out tasks and notices
                const taskPromise = this.dispatcher.dispatch(context.tasks);
                const noticePromise = this.notifier.send(context.notices);
                yield Promise.all([taskPromise, noticePromise]);
                // log executiong time and return the result
                this.logger && this.logger.log(`Executed ${this.action.name}`, { time: util_1.since(start) });
                return result;
            }
            catch (error) {
                if (dao && dao.isActive) {
                    yield dao.release(dao.inTransaction ? 'rollback' : undefined);
                }
                // TODO: log error -- add option, all or server only
                return Promise.reject(error);
            }
        });
    }
}
exports.Executor = Executor;
//# sourceMappingURL=Executor.js.map
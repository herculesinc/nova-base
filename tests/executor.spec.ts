import { expect } from 'chai';
import * as sinon from 'sinon';

import {
    Authenticator, Dao, Database, Cache, Dispatcher, RateOptions,
    Notifier, RateLimiter, Task, Notice, Logger
} from './../index';
import { Executor, ExecutorContext, ExecutionOptions } from './../lib/Executor';
import { Exception, ExceptionOptions } from './../lib/errors';
import { ActionContext } from './../lib/Action';
import { MockDao } from './mocks/Database';

const localRateLimits: RateOptions = {
    limit : 10,
    window: 250
};

const globalRateLimits: RateOptions = {
    limit : 20,
    window: 250
};

const options: ExecutionOptions = {
    authOptions: { foo: 'bar' },
    daoOptions : { startTransaction: true }
};

const authenticatorResult: string = 'authenticator_result';
const adapterResult: string = 'adapter_result';
const actionResult: string = 'action_result';
const dActionResult: string = 'deferred_action_result';
const nActionResult: string = 'normal_action_result';
const sAction1Result: string = 'suppressed_action_result_1';
const sAction2Result: string = 'suppressed_action_result_2';

const requestor = {
    ip          : 'testip',
    auth: {
        userId  : 'user1',
        password: 'password1'
    }
};
const inputs = {
    firstName: 'John',
    lastName : 'Smith'
};

const toOwnerResult: string = requestor.auth.userId;

let authenticator: Authenticator<any,any>;
let dao: Dao;
let database: Database;
let cache: Cache;
let dispatcher: Dispatcher;
let notifier: Notifier;
let limiter: RateLimiter;
let logger: Logger;
let context: ExecutorContext;
let task: Task;
let notice: Notice;
let adapter: any;
let action: any;
let normalAction: any;
let deferredAction: any;
let suppressedAction1: any;
let suppressedAction2: any;
let suppressedAction3: any;
let executor: Executor<any,any>;
let exceptionOptions: ExceptionOptions;
let exception: Exception;

let tmpOptions: ExecutionOptions;

describe('NOVA-BASE -> Executor tests;', () => {

    beforeEach(done => {
        authenticator = {
            decode      : sinon.stub().returns(requestor),
            toOwner     : sinon.stub().returns(toOwnerResult),
            authenticate: sinon.stub()
        };

        dao = new MockDao(options.daoOptions);

        database = {
            connect: sinon.stub().returns(Promise.resolve(dao))
        };

        cache = {
            get    : sinon.stub().returns(Promise.resolve()),
            set    : sinon.stub(),
            execute: sinon.stub().returns(Promise.resolve()),
            clear  : sinon.stub()
        };

        dispatcher = {
            sendMessage   : sinon.stub().callsArg(3),
            receiveMessage: sinon.stub().callsArg(0), 
            deleteMessage : sinon.stub().callsArg(0)
        };

        notifier = { send: sinon.stub() };
        limiter = { 'try': sinon.stub() };

        logger = {
            debug  : sinon.spy(),
            log    : sinon.spy(),
            info   : sinon.spy(),
            warn   : sinon.spy(),
            error  : sinon.spy(),
            track  : sinon.spy(),
            trace  : sinon.spy(),
            request: sinon.spy()
        };

        context = {
            authenticator: authenticator,
            database     : database,
            cache        : cache,
            dispatcher   : dispatcher,
            notifier     : notifier,
            limiter      : limiter,
            logger       : logger,
            rateLimits   : globalRateLimits
        };

        task = {
            queue  : 'task',
            payload: {},
            merge  : sinon.stub().returns(task)
        };

        notice = {
            target : 'target',
            event  : 'event',
            payload: {},
            merge  : sinon.stub().returns(notice)
        };

        adapter = sinon.stub();

        action = function action(this: ActionContext): Promise<any> {
            // adding task and notice
            this.register(task);
            this.register(notice);

            // adding cache keys
            this.invalidate('key1');
            this.invalidate('key2');

            return Promise.resolve(actionResult);
        };

        action = sinon.spy(action);

        sinon.spy(dao, 'close');

        done();
    });

    describe('authenticator, adapter and action should be called in ActionContext;', () => {
        it('authenticator.authenticate should be called in ActionContext', done => {
            context.authenticator.authenticate = function(): Promise<any> {
                try {
                    expect(this).to.be.instanceof(ActionContext);
                    done();
                } catch (error) {
                    done(error);
                }
                return Promise.resolve();
            };

            executor = new Executor(context, action, adapter, options);

            executor.execute(inputs, requestor).catch(done);
        });

        it('adapter should be called in ActionContext', done => {
            adapter = function adapter(): Promise<any> {
                try {
                    expect(this).to.be.instanceof(ActionContext);
                    done();
                } catch (error) {
                    done(error);
                }
                return Promise.resolve();
            };

            executor = new Executor(context, action, adapter, options);

            executor.execute(inputs, requestor).catch(done);
        });

        it('action should be called in ActionContext', done => {
            action = function action(): Promise<any> {
                try {
                    expect(this).to.be.instanceof(ActionContext);
                    done();
                } catch (error) {
                    done(error);
                }
                return Promise.resolve();
            };

            executor = new Executor(context, action, adapter, options);

            executor.execute(inputs, requestor).catch(done);
        });
    });

    describe('executor.execute should call functions with right arguments and in right order;', () => {

        beforeEach(done => {
            (authenticator.authenticate as any).returns(Promise.resolve(authenticatorResult));
            (limiter.try as any).returns(Promise.resolve(authenticatorResult));
            (adapter as any).returns(Promise.resolve(adapterResult));
            (dispatcher.sendMessage as any).callsArg(3);
            (notifier.send as any).returns(Promise.resolve());

            executor = new Executor(context, action, adapter, options);

            executor.execute(inputs, requestor).then(() => done()).catch(done);
        });

        describe('logger', () => {
            it('logger.debug should be called once', () => {
                expect((logger.debug as any).calledOnce).to.be.true;
            });

            it('logger.debug should be called with (\'Executing [actionName] action\') arguments', () => {
                expect((logger.debug as any).firstCall.calledWithExactly('Executing proxy action')).to.be.true;
            });

            it('logger.error should not be called', () => {
                expect((logger.error as any).called).to.be.false;
            });
        });

        describe('limiter.try', () => {
            it('limiter.try should be called once', () => {
                expect((limiter.try as any).calledOnce).to.be.true;
            });

            it('limiter.try should be called with global rateLimits arguments', () => {
                expect((limiter.try as any).calledWithExactly(toOwnerResult, globalRateLimits)).to.be.true;
            });

            it('limiter.try should return Promise<Dao>', () => {
                expect((limiter.try as any).firstCall.returnValue).to.be.instanceof(Promise);
            });
        });

        describe('database.connect', () => {
            it('database.connect should be called once', () => {
                expect((database.connect as any).calledOnce).to.be.true;
            });

            it('database.connect should be called after limiter.try', () => {
                expect((database.connect as any).calledAfter(limiter.try)).to.be.true;
            });

            it('database.connect should be called with daoOptions arguments', () => {
                expect((database.connect as any).calledWithExactly(options.daoOptions)).to.be.true;
            });

            it('database.connect should return Promise<Dao>', done => {
                expect((database.connect as any).firstCall.returnValue).to.be.instanceof(Promise);

                (database.connect as any).firstCall.returnValue
                    .then(result => {
                        expect(result).to.be.instanceof(MockDao);
                        done();
                    })
                    .catch(done);
            });
        });

        describe('authenticator.authenticate', () => {
            it('authenticator.authenticate should be called once', () => {
                expect((authenticator.authenticate as any).calledOnce).to.be.true;
            });

            it('authenticator.authenticate should be called after database.connect', () => {
                expect((authenticator.authenticate as any).calledAfter(database.connect)).to.be.true;
            });

            it('authenticator.authenticate should be called with daoOptions arguments', () => {
                expect((authenticator.authenticate as any).calledWithExactly(requestor, options.authOptions)).to.be.true;
            });

            it('authenticator.authenticate should return Promise<authenticatorResult>', done => {
                expect((authenticator.authenticate as any).firstCall.returnValue).to.be.instanceof(Promise);

                (authenticator.authenticate as any).firstCall.returnValue
                    .then(result => {
                        expect(result).to.be.equal(authenticatorResult);
                        done();
                    })
                    .catch(done);
            });
        });

        describe('adapter', () => {
            it('adapter should be called once', () => {
                expect((adapter as any).calledOnce).to.be.true;
            });

            it('adapter should be called after authenticator.authenticate', () => {
                expect((adapter as any).calledAfter(authenticator.authenticate)).to.be.true;
            });

            it('adapter should be called with (inputs, authenticatorResult) arguments', () => {
                expect((adapter as any).calledWithExactly(inputs, authenticatorResult, requestor.ip)).to.be.true;
            });

            it('adapter should return Promise<adapterResult>', done => {
                expect((adapter as any).firstCall.returnValue).to.be.instanceof(Promise);

                (adapter as any).firstCall.returnValue
                    .then(result => {
                        expect(result).to.be.equal(adapterResult);
                        done();
                    })
                    .catch(done);
            });
        });

        describe('action', () => {
            it('action should be called once', () => {
                expect((action as any).calledOnce).to.be.true;
            });

            it('action should be called after adapter', () => {
                expect((action as any).calledAfter(adapter)).to.be.true;
            });

            it('action should be called with (adapterResult) arguments', () => {
                expect((action as any).calledWithExactly(adapterResult)).to.be.true;
            });

            it('adapter should return Promise<actionResult>', done => {
                expect((action as any).firstCall.returnValue).to.be.instanceof(Promise);

                (action as any).firstCall.returnValue
                    .then(result => {
                        expect(result).to.be.equal(actionResult);
                        done();
                    })
                    .catch(done);
            });
        });

        describe('dao.close', () => {
            it('dao.close should be called once', () => {
                expect((dao.close as any).calledOnce).to.be.true;
            });

            it('dao.close should be called after action', () => {
                expect((dao.close as any).calledAfter(action)).to.be.true;
            });

            it('dao.close should be called with (\'commit\') arguments', () => {
                expect((dao.close as any).calledWithExactly('commit')).to.be.true;
            });

            it('dao.close should return Promise<any>', () => {
                expect((dao.close as any).firstCall.returnValue).to.be.instanceof(Promise);
            });
        });

        describe('cache.clear', () => {
            it('cache.clear should be called once', () => {
                expect((cache.clear as any).calledOnce).to.be.true;
            });

            it('cache.clear should be called after dao.close', () => {
                expect((cache.clear as any).calledAfter(dao.close)).to.be.true;
            });

            it('cache.clear should be called with ([\'key1\', \'key2\']) arguments', () => {
                expect((cache.clear as any).calledWithExactly(['key1', 'key2'])).to.be.true;
            });
        });

        describe('dispatcher.sendMessage', () => {
            it('dispatcher.sendMessage should be called once', () => {
                expect((dispatcher.sendMessage as any).calledOnce).to.be.true;
            });

            it('dispatcher.sendMessage should be called with (task) arguments', () => {
                expect((dispatcher.sendMessage as any).calledWithMatch(task.queue, task.payload)).to.be.true;
            });
        });

        describe('notifier.send', () => {
            it('notifier.send should be called once', () => {
                expect((notifier.send as any).calledOnce).to.be.true;
            });

            it('notifier.send should be called with (notice) arguments', () => {
                expect((notifier.send as any).calledWithExactly([notice])).to.be.true;
            });

            it('notifier.send should return Promise<any>', () => {
                expect((notifier.send as any).firstCall.returnValue).to.be.instanceof(Promise);
            });
        });

        describe('logger.log', () => {
            it('logger.log should be called once', () => {
                expect((logger.log as any).calledOnce).to.be.true;
            });

            it('logger.log should be called after notifier.send', () => {
                expect((logger.log as any).calledAfter(notifier.send)).to.be.true;
            });

            it('logger.log should be called with (\'Executed [actionName]\', { time: number }) arguments', () => {
                let args = (logger.log as any).firstCall.args;

                expect(args.length).to.equal(2);
                expect(args[0]).to.match(/^Executed .+$/);
                expect(Object.keys(args[1])).to.deep.equal(['time']);
            });
        });
    });

    describe('executor.execute should call limiter.try with different arguments;', () => {
        describe('when requestor contains only IP address', () => {
            beforeEach(done => {
                executor = new Executor(context, action, adapter, options);

                executor.execute(inputs, { ip: 'ipaddress' }).then(() => done()).catch(done);
            });

            it('limiter.try should be called once', () => {
                expect((limiter.try as any).calledOnce).to.be.true;
            });

            it('limiter.try should be called with global rateLimits arguments', () => {
                expect((limiter.try as any).calledWithExactly('ipaddress', globalRateLimits)).to.be.true;
            });
        });

        describe('when using local scope', () => {
            beforeEach(done => {
                tmpOptions = Object.assign({}, options, { rateLimits: localRateLimits });
                const tmpContext = Object.assign({}, context, { rateLimits: undefined });

                executor = new Executor(tmpContext, action, adapter, tmpOptions);

                executor.execute(inputs, requestor).then(() => done()).catch(done);
            });

            it('limiter.try should be called once', () => {
                expect((limiter.try as any).calledOnce).to.be.true;
            });

            it('limiter.try should be called with rateLimits.local arguments', () => {
                expect((limiter.try as any).calledWithExactly(`${toOwnerResult}::proxy`, localRateLimits)).to.be.true;
            });
        });

        describe('when using global and local scope', () => {
            beforeEach(done => {
                tmpOptions = Object.assign({}, options, { rateLimits: localRateLimits });

                executor = new Executor(context, action, adapter, tmpOptions);

                executor.execute(inputs, requestor).then(() => done()).catch(done);
            });

            it('limiter.try should be called twice', () => {
                expect((limiter.try as any).calledTwice).to.be.true;
            });

            it('limiter.try should be called with global rateLimits arguments', () => {
                expect((limiter.try as any).calledWithExactly(toOwnerResult, globalRateLimits)).to.be.true;
            });

            it('limiter.try should be called with local rateLimits arguments', () => {
                expect((limiter.try as any).calledWithExactly(`${toOwnerResult}::proxy`, localRateLimits)).to.be.true;
            });
        });
    });

    describe('executor.execute should call dao.close without transaction;', () => {
        beforeEach(done => {
            tmpOptions = Object.assign({}, options, { daoOptions: { startTransaction: false } });

            dao = new MockDao(tmpOptions.daoOptions);
            database = { connect: sinon.stub().returns(Promise.resolve(dao)) };

            sinon.spy(dao, 'close');

            (context as any).database = database;

            executor = new Executor(context, action, adapter, tmpOptions);

            executor.execute(inputs, requestor).then(() => done()).catch(done);
        });

        it('database.connect should be called with daoOptions arguments', () => {
            expect((database.connect as any).calledWithExactly(tmpOptions.daoOptions)).to.be.true;
        });

        it('dao.close should be called with empty arguments', () => {
            expect((dao.close as any).calledWithExactly(undefined)).to.be.true;
        });
    });

    describe('executor.execute should not call cache.clear if cache keys was not provided;', () => {
        beforeEach(done => {
            action = sinon.stub().returns(Promise.resolve());

            executor = new Executor(context, action, adapter, options);

            executor.execute(inputs, { ip: 'ipaddress' }).then(() => done()).catch(done);
        });

        it('cache.clear should not be called', () => {
            expect((cache.clear as any).called).to.be.false;
        });
    });

    describe('deferred actions should be executed after all other actions are executed and the database transaction is committed and released;', () => {
        beforeEach(done => {
            normalAction = sinon.stub().returns(Promise.resolve(nActionResult));
            deferredAction = sinon.stub().returns(Promise.resolve(dActionResult));

            action = function action(this: ActionContext): Promise<any> {
                // adding task and notice
                this.register(task);
                this.register(notice);

                // adding cache keys
                this.invalidate('key1');
                this.invalidate('key2');

                this.defer(deferredAction, inputs);
                this.run(normalAction, inputs);

                return Promise.resolve();
            };

            action = sinon.spy(action);

            executor = new Executor(context, action, adapter, options);

            executor.execute(inputs, requestor).then(() => done()).catch(done);
        });


        it('normalAction should be called after action', () => {
            expect((normalAction as any).calledAfter(action)).to.be.true;
        });

        it('normalAction should be called before dao.close', () => {
            expect((normalAction as any).calledBefore(dao.close)).to.be.true;
        });

        it('deferredAction should be called after dao.close', () => {
            expect((deferredAction as any).calledAfter(dao.close)).to.be.true;
        });

        it('deferredAction should be called before notifier.send', () => {
            expect((deferredAction as any).calledBefore(notifier.send)).to.be.true;
        });

        it('deferredAction should be called before dispatcher.sendMessage', () => {
            expect((deferredAction as any).calledBefore(dispatcher.sendMessage)).to.be.true;
        });
    });

    describe('suppressed actions should not be executed;', () => {
        const suppressTag1 = Symbol();
        const suppressTag2 = Symbol();
        const sMessage = 'suppressed message';
        const uMessage = 'unsuppressed message';

        beforeEach(done => {
            suppressedAction1 = sinon.stub().returns(Promise.resolve(sAction1Result));
            suppressedAction2 = sinon.stub().returns(Promise.resolve(sAction2Result));
            suppressedAction3 = function action(this: ActionContext): Promise<any> {
                this.unsuppress(suppressedAction1, suppressTag2);
                this.unsuppress(suppressedAction2, suppressTag1);

                // should not be executed
                this.run(suppressedAction1, { message: sMessage});

                // should be executed
                this.run(suppressedAction2, { message: uMessage});

                return Promise.resolve();
            };

            action = function action(this: ActionContext): Promise<any> {
                // should be executed
                this.run(suppressedAction1, { message: uMessage});

                this.suppress(suppressedAction1, suppressTag1);
                this.suppress(suppressedAction2, suppressTag1);

                // should not be executed
                this.run(suppressedAction1, { message: sMessage});
                this.run(suppressedAction2, { message: sMessage});

                // should be executed
                this.run(suppressedAction3, { message: uMessage});

                this.unsuppress(suppressedAction2, suppressTag1);

                // should not be executed
                this.run(suppressedAction2, { message: uMessage});

                return Promise.resolve();
            };

            action = sinon.spy(action);
            suppressedAction3 = sinon.spy(suppressedAction3);

            executor = new Executor(context, action, adapter, options);

            executor.execute(inputs, requestor).then(() => done()).catch(done);
        });


        it('suppressedAction1 should be called once', () => {
            expect((suppressedAction1 as any).calledOnce).to.be.true;
        });

        it('suppressedAction1 should be called with right arguments', () => {
            expect((suppressedAction1 as any).alwaysCalledWithExactly({ message: uMessage})).to.be.true;
        });

        it('suppressedAction2 should be called twice', () => {
            expect((suppressedAction2 as any).calledTwice).to.be.true;
        });

        it('suppressedAction2 should be called with right arguments', () => {
            expect((suppressedAction2 as any).alwaysCalledWithExactly({ message: uMessage})).to.be.true;
        });

        it('suppressedAction3 should be called once', () => {
            expect((suppressedAction3 as any).calledOnce).to.be.true;
        });

        it('suppressedAction3 should be called with right arguments', () => {
            expect((suppressedAction3 as any).alwaysCalledWithExactly({ message: uMessage})).to.be.true;
        });

    });

    describe('executor.execute should return error;', () => {
        let errorObj;

        beforeEach(() => {
            exceptionOptions = {
                message: 'Test Error',
                status: 501,
                allowCommit: false
            };

            exception = new Exception(exceptionOptions);
        });

        describe('if authenticator.authenticate throw an exception, executor should not commit transaction or dispatch any tasks/notices;', () => {
            beforeEach(done => {
                (authenticator.authenticate as any).throws(exception);

                executor = new Executor(context, action, adapter, tmpOptions);

                executor.execute(inputs, requestor).then(done).catch(error => {
                    errorObj = error;
                    done();
                });
            });

            it('should return Error', () => {
                expect(errorObj).to.be.instanceof(Exception);
            });

            it('authenticator.authenticate should be called once', () => {
                expect((authenticator.authenticate as any).calledOnce).to.be.true;
            });

            it('dao.close should be called with (\'rollback\') arguments', () => {
                expect((dao.close as any).calledWithExactly('rollback')).to.be.true;
            });
        });

        describe('if limiter.try throw an exception, executor should not commit transaction or dispatch any tasks/notices;', () => {
            beforeEach(done => {
                (limiter.try as any).throws(exception);

                executor = new Executor(context, action, adapter, tmpOptions);

                executor.execute(inputs, requestor).then(done).catch(error => {
                    errorObj = error;
                    done();
                });
            });

            it('should return Error', () => {
                expect(errorObj).to.be.instanceof(Exception);
            });

            it('limiter.try should be called once', () => {
                expect((limiter.try as any).calledOnce).to.be.true;
            });

            it('database.connect should be called once', () => {
                expect((database.connect as any).called).to.be.false;
            });

            it('dao.close should not be called', () => {
                expect((dao.close as any).called).to.be.false;
            });
        });

        describe('if action throw an exception, executor should not commit transaction or dispatch any tasks/notices;', () => {
            beforeEach(done => {
                action = function action(this: ActionContext): Promise<any> {
                    // adding task and notice
                    this.register(task);
                    this.register(notice);

                    // adding cache keys
                    this.invalidate('key1');
                    this.invalidate('key2');

                    throw exception;
                };

                action = sinon.spy(action);

                executor = new Executor(context, action, adapter, tmpOptions);

                executor.execute(inputs, requestor).then(done).catch(error => {
                    errorObj = error;
                    done();
                });
            });

            it('should return Error', () => {
                expect(errorObj).to.be.instanceof(Exception);
            });

            it('limiter.try should be called once', () => {
                expect((limiter.try as any).calledOnce).to.be.true;
            });

            it('database.connect should be called once', () => {
                expect((database.connect as any).called).to.be.true;
            });

            it('action should be called once', () => {
                expect((action as any).called).to.be.true;
            });

            it('dao.close should be called with (\'rollback\') arguments', () => {
                expect((dao.close as any).calledWithExactly('rollback')).to.be.true;
            });

            it('cache.clear should not be called', () => {
                expect((cache.clear as any).called).to.be.false;
            });

            it('dispatcher.sendMessage should not be called', () => {
                expect((dispatcher.sendMessage as any).called).to.be.false;
            });

            it('notifier.send should not be called', () => {
                expect((notifier.send as any).called).to.be.false;
            });
        });

        describe('if action return an error, executor should commit transaction and dispatch all tasks/notices;', () => {
            beforeEach(done => {
                action = function action(this: ActionContext): Promise<any> {
                    // adding task and notice
                    this.register(task);
                    this.register(notice);

                    // adding cache keys
                    this.invalidate('key1');
                    this.invalidate('key2');

                    return Promise.resolve(exception);
                };

                action = sinon.spy(action);

                executor = new Executor(context, action, adapter, tmpOptions);

                executor.execute(inputs, requestor).then(done).catch(error => {
                    errorObj = error;
                    done();
                });
            });

            it('should return Error', () => {
                expect(errorObj).to.be.instanceof(Exception);
            });

            it('limiter.try should be called once', () => {
                expect((limiter.try as any).calledOnce).to.be.true;
            });

            it('database.connect should be called once', () => {
                expect((database.connect as any).called).to.be.true;
            });

            it('action should be called once', () => {
                expect((action as any).called).to.be.true;
            });

            it('dao.close should be called with (\'commit\') arguments', () => {
                expect((dao.close as any).calledWithExactly('commit')).to.be.true;
            });

            it('cache.clear should be called once', () => {
                expect((cache.clear as any).calledOnce).to.be.true;
            });

            it('dispatcher.sendMessage should be called once', () => {
                expect((dispatcher.sendMessage as any).calledOnce).to.be.true;
            });

            it('notifier.send should be called once', () => {
                expect((notifier.send as any).calledOnce).to.be.true;
            });
        });

        describe('if cache.clear throw an exception, executor should not commit transaction or dispatch any tasks/notices;', () => {
            beforeEach(done => {
                (cache.clear as any).throws(exception);

                executor = new Executor(context, action, adapter, tmpOptions);

                executor.execute(inputs, requestor).then(done).catch(error => {
                    errorObj = error;
                    done();
                });
            });

            it('should return Error', () => {
                expect(errorObj).to.be.instanceof(Exception);
            });

            it('cache should be called once', () => {
                expect((cache.clear as any).calledOnce).to.be.true;
            });

            it('dao.close should be called with (\'commit\') arguments', () => {
                expect((dao.close as any).calledWithExactly('commit')).to.be.true;
            });
        });
    });
});

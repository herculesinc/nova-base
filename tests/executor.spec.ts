///<reference path="../typings/index.d.ts"/>
import { expect } from 'chai';
import * as sinon from 'sinon';

import {
    Authenticator, Dao, Database, Cache, Dispatcher, RateOptions, Notifier, RateLimiter, Task, Notice, Logger,
    AuthInputs
} from './../index';
import { Executor, ExecutorContext, ExecutionOptions } from './../lib/Executor';
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

const requestor = {
    scheme     : 'token',
    credentials: 'testtoken1'
};
const inputs = {
    firstName: 'John',
    lastName : 'Smith'
};

let authenticator: Authenticator;
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
let executor: Executor<any,any>;

let tmpOptions: ExecutionOptions;

describe('NOVA-BASE -> Executor tests;', () => {

    beforeEach(done => {
        authenticator = sinon.stub();
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

        dispatcher = { dispatch: sinon.stub() };
        notifier = { send: sinon.stub() };
        limiter = { try: sinon.stub() };

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
            settings     : { count: 5 },
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

        sinon.spy(dao, 'release');

        done();
    });

    describe('authenticator, adapter and action should be called in ActionContext;', () => {
        it('authenticator should be called in ActionContext', done => {
            context.authenticator = function authenticate(inputs: AuthInputs, options: any): Promise<any> {
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
            (limiter.try as any).returns(Promise.resolve(authenticatorResult));
            (authenticator as any).returns(Promise.resolve(authenticatorResult));
            (adapter as any).returns(Promise.resolve(adapterResult));
            (dispatcher.dispatch as any).returns(Promise.resolve());
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
                expect((limiter.try as any).calledWithExactly(`${requestor.scheme}::${requestor.credentials}`, globalRateLimits)).to.be.true;
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

        describe('authenticator', () => {
            it('authenticator should be called once', () => {
                expect((authenticator as any).calledOnce).to.be.true;
            });

            it('authenticator should be called after database.connect', () => {
                expect((authenticator as any).calledAfter(database.connect)).to.be.true;
            });

            it('authenticator should be called with daoOptions arguments', () => {
                expect((authenticator as any).calledWithExactly(requestor, options.authOptions)).to.be.true;
            });

            it('authenticator should return Promise<authenticatorResult>', done => {
                expect((authenticator as any).firstCall.returnValue).to.be.instanceof(Promise);

                (authenticator as any).firstCall.returnValue
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

            it('adapter should be called after authenticator', () => {
                expect((adapter as any).calledAfter(authenticator)).to.be.true;
            });

            it('adapter should be called with (inputs, authenticatorResult) arguments', () => {
                expect((adapter as any).calledWithExactly(inputs, authenticatorResult)).to.be.true;
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

        describe('dao.release', () => {
            it('dao.release should be called once', () => {
                expect((dao.release as any).calledOnce).to.be.true;
            });

            it('dao.release should be called after action', () => {
                expect((dao.release as any).calledAfter(action)).to.be.true;
            });

            it('dao.release should be called with (\'commit\') arguments', () => {
                expect((dao.release as any).calledWithExactly('commit')).to.be.true;
            });

            it('dao.release should return Promise<any>', () => {
                expect((dao.release as any).firstCall.returnValue).to.be.instanceof(Promise);
            });
        });

        describe('cache.clear', () => {
            it('cache.clear should be called once', () => {
                expect((cache.clear as any).calledOnce).to.be.true;
            });

            it('cache.clear should be called after dao.release', () => {
                expect((cache.clear as any).calledAfter(dao.release)).to.be.true;
            });

            it('cache.clear should be called with ([\'key1\', \'key2\']) arguments', () => {
                expect((cache.clear as any).calledWithExactly(['key1', 'key2'])).to.be.true;
            });
        });

        describe('dispatcher.dispatch', () => {
            it('dispatcher.dispatch should be called once', () => {
                expect((dispatcher.dispatch as any).calledOnce).to.be.true;
            });

            it('dispatcher.dispatch should be called with (task) arguments', () => {
                expect((dispatcher.dispatch as any).calledWithExactly([task])).to.be.true;
            });

            it('dispatcher.dispatch should return Promise<any>', () => {
                expect((dispatcher.dispatch as any).firstCall.returnValue).to.be.instanceof(Promise);
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
        describe('when requestor is a string', () => {
            beforeEach(done => {
                executor = new Executor(context, action, adapter, options);

                executor.execute(inputs, 'requestor').then(() => done()).catch(done);
            });

            it('limiter.try should be called once', () => {
                expect((limiter.try as any).calledOnce).to.be.true;
            });

            it('limiter.try should be called with global rateLimits arguments', () => {
                expect((limiter.try as any).calledWithExactly('requestor', globalRateLimits)).to.be.true;
            });
        });

        describe('when using local scope', () => {
            beforeEach(done => {
                tmpOptions = Object.assign({}, options, { rateLimits: localRateLimits });
                const tmpContext = Object.assign({}, context);
                tmpContext.rateLimits = undefined;

                executor = new Executor(tmpContext, action, adapter, tmpOptions);

                executor.execute(inputs, requestor).then(() => done()).catch(done);
            });

            it('limiter.try should be called once', () => {
                expect((limiter.try as any).calledOnce).to.be.true;
            });

            it('limiter.try should be called with rateLimits.local arguments', () => {
                expect((limiter.try as any).calledWithExactly(`${requestor.scheme}::${requestor.credentials}::proxy`, localRateLimits)).to.be.true;
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
                expect((limiter.try as any).calledWithExactly(`${requestor.scheme}::${requestor.credentials}`, globalRateLimits)).to.be.true;
            });

            it('limiter.try should be called with local rateLimits arguments', () => {
                expect((limiter.try as any).calledWithExactly(`${requestor.scheme}::${requestor.credentials}::proxy`, localRateLimits)).to.be.true;
            });
        });
    });

    describe('executor.execute should call dao.release without transaction;', () => {
        beforeEach(done => {
            tmpOptions = Object.assign({}, options, { daoOptions: { startTransaction: false } });

            dao = new MockDao(tmpOptions.daoOptions);
            database = { connect: sinon.stub().returns(Promise.resolve(dao)) };

            sinon.spy(dao, 'release');

            context.database = database;

            executor = new Executor(context, action, adapter, tmpOptions);

            executor.execute(inputs, requestor).then(() => done()).catch(done);
        });

        it('database.connect should be called with daoOptions arguments', () => {
            expect((database.connect as any).calledWithExactly(tmpOptions.daoOptions)).to.be.true;
        });

        it('dao.release should be called with empty arguments', () => {
            expect((dao.release as any).calledWithExactly(undefined)).to.be.true;
        });
    });

    describe('executor.execute should not call cache.clear if cache keys was not provided;', () => {
        beforeEach(done => {
            action = sinon.stub().returns(Promise.resolve());

            executor = new Executor(context, action, adapter, options);

            executor.execute(inputs, 'requestor').then(() => done()).catch(done);
        });

        it('cache.clear should not be called', () => {
            expect((cache.clear as any).called).to.be.false;
        });
    });

    describe('executor.execute should return error;', () => {
        let errorObj;

        describe('authenticator', () => {
            describe('if authenticator return error', () => {
                beforeEach(done => {
                    (authenticator as any).throws();

                    executor = new Executor(context, action, adapter, tmpOptions);

                    executor.execute(inputs, requestor).then(done).catch(error => {
                        errorObj = error;
                        done();
                    });
                });

                it('should return Error', () => {
                    expect(errorObj).to.be.instanceof(Error);
                });

                it('authenticator should be called once', () => {
                    expect((authenticator as any).calledOnce).to.be.true;
                });

                it('dao.release should be called with (\'rollback\') arguments', () => {
                    expect((dao.release as any).calledWithExactly('rollback')).to.be.true;
                });
            });

            describe('if authenticator was rejected', () => {
                beforeEach(done => {
                    (authenticator as any).returns(new Promise((resolve, reject) => reject('Anauthenticated')));

                    executor = new Executor(context, action, adapter, tmpOptions);

                    executor.execute(inputs, requestor).then(done).catch(error => {
                        errorObj = error;
                        done();
                    });
                });

                it('should return Error', () => {
                    expect(errorObj).to.be.instanceof(Error);
                });

                it('authenticator should be called once', () => {
                    expect((authenticator as any).calledOnce).to.be.true;
                });

                it('dao.release should be called with (\'rollback\') arguments', () => {
                    expect((dao.release as any).calledWithExactly('rollback')).to.be.true;
                });
            });
        });

        describe('limiter', () => {
            describe('if limiter.try return error', () => {
                beforeEach(done => {
                    (limiter.try as any).throws();

                    executor = new Executor(context, action, adapter, tmpOptions);

                    executor.execute(inputs, requestor).then(done).catch(error => {
                        errorObj = error;
                        done();
                    });
                });

                it('should return Error', () => {
                    expect(errorObj).to.be.instanceof(Error);
                });

                it('limiter.try should be called once', () => {
                    expect((limiter.try as any).calledOnce).to.be.true;
                });

                it('database.connect should be called once', () => {
                    expect((database.connect as any).called).to.be.false;
                });

                it('dao.release should not be called', () => {
                    expect((dao.release as any).called).to.be.false;
                });
            });

            describe('if limiter.try was rejected', () => {
                beforeEach(done => {
                    (limiter.try as any).returns(new Promise((resolve, reject) => reject('Rate limit exceeded')));

                    executor = new Executor(context, action, adapter, tmpOptions);

                    executor.execute(inputs, requestor).then(done).catch(error => {
                        errorObj = error;
                        done();
                    });
                });

                it('should return Error', () => {
                    expect(errorObj).to.be.instanceof(Error);
                });

                it('limiter.try should be called once', () => {
                    expect((limiter.try as any).calledOnce).to.be.true;
                });

                it('database.connect should be called once', () => {
                    expect((database.connect as any).called).to.be.false;
                });

                it('dao.release should not be called', () => {
                    expect((dao.release as any).called).to.be.false;
                });
            });
        });

        describe('cache', () => {
            describe('if cache.clear return error', () => {
                beforeEach(done => {
                    (cache.clear as any).throws();

                    executor = new Executor(context, action, adapter, tmpOptions);

                    executor.execute(inputs, requestor).then(done).catch(error => {
                        errorObj = error;
                        done();
                    });
                });

                it('should return Error', () => {
                    expect(errorObj).to.be.instanceof(Error);
                });

                it('cache should be called once', () => {
                    expect((cache.clear as any).calledOnce).to.be.true;
                });

                it('dao.release should be called with (\'commit\') arguments', () => {
                    expect((dao.release as any).calledWithExactly('commit')).to.be.true;
                });
            });
        });
    });
});

///<reference path="../typings/index.d.ts"/>
import { expect } from 'chai';
import * as sinon from 'sinon';

import { Authenticator, Dao, Database, Cache, Dispatcher,
         Notifier, RateLimiter, Task, Notice, Logger, AuthInputs } from './../index';
import { Executor, ExecutorContext, ExecutionOptions } from './../lib/Executor';
import { ActionContext } from './../lib/Action';
import { MockDao } from './mocks/Database';

const options: ExecutionOptions = {
    authOptions: { foo: 'bar' },
    daoOptions : { startTransaction: true },
    rateOptions: { limit: 10, window: 250 }
};

const settings  = { count: 5 };
const requestor = { scheme: 'token', credentials: 'testtoken1' };
const inputs    = { firstName: 'John', lastName: 'Smith' };

let tmpOptions;

describe( 'NOVA-BASE -> Executor tests;', () => {

    beforeEach( done => {
        const self = this;

        this.authenticatorResult = 'authenticator_result';
        this.adapterResult       = 'adapter_result';
        this.actionResult        = 'action_result';

        this.authenticator = <Authenticator> sinon.stub();

        this.dao = <Dao> new MockDao( options.daoOptions );

        sinon.spy( this.dao, 'release' );

        this.database = <Database> {
            connect: sinon.stub().returns( Promise.resolve( this.dao ) )
        };

        this.cache = <Cache> {
            get    : sinon.stub().returns( Promise.resolve() ),
            set    : sinon.stub(),
            execute: sinon.stub().returns( Promise.resolve() ),
            clear  : sinon.stub()
        }

        this.dispatcher = <Dispatcher> { dispatch: sinon.stub() };
        this.notifier   = <Notifier> { send: sinon.stub() };
        this.limiter    = <RateLimiter> { try: sinon.stub() };

        this.logger = <Logger> {
            debug: sinon.spy(),
            log  : sinon.spy(),
            info : sinon.spy(),
            warn : sinon.spy(),
            error: sinon.spy(),
            track: sinon.spy(),
            trace: sinon.spy()
        };

        this.context = <ExecutorContext> {
            authenticator: this.authenticator,
            database     : this.database,
            cache        : this.cache,
            dispatcher   : this.dispatcher,
            notifier     : this.notifier,
            limiter      : this.limiter,
            logger       : this.logger,
            settings     : { count: 5 }
        };

        this.task = <Task> {
            queue: 'task',
            merge: sinon.stub().returns( this.task )
        };

        this.notice = <Notice> {
            target: 'target',
            event : 'event',
            merge : sinon.stub().returns( this.notice )
        };

        this.adapter = sinon.stub();

        this.action = function action(this: ActionContext, inputs: string): Promise<any> {
            // adding task and notice
            this.register( self.task );
            this.register( self.notice );

            // adding cache keys
            this.invalidate( 'key1' );
            this.invalidate( 'key2' );

            return Promise.resolve( self.actionResult );
        };

        this.action = sinon.spy( this, 'action' );

        done();
    } );

    describe( 'authenticator, adapter and action should be called in ActionContext;', () => {
        it( 'authenticator should be called in ActionContext', done => {
            this.context.authenticator = function authenticate(inputs: AuthInputs, options: any): Promise<any> {
                try {
                    expect( this ).to.be.instanceof( ActionContext );
                    done();
                } catch ( error ) {
                    done( error );
                }
                return Promise.resolve();
            };

            this.executor = new Executor( this.context, this.action, this.adapter, options );

            this.executor.execute( inputs, requestor ).catch( done );
        } );

        it( 'adapter should be called in ActionContext', done => {
            this.adapter = function adapter(inputs: any, token: any): Promise<any> {
                try {
                    expect( this ).to.be.instanceof( ActionContext );
                    done();
                } catch ( error ) {
                    done( error );
                }
                return Promise.resolve();
            };

            this.executor = new Executor( this.context, this.action, this.adapter, options );

            this.executor.execute( inputs, requestor ).catch( done );
        } );

        it( 'action should be called in ActionContext', done => {
            this.action = function action(inputs: string): Promise<any> {
                try {
                    expect( this ).to.be.instanceof( ActionContext );
                    done();
                } catch ( error ) {
                    done( error );
                }
                return Promise.resolve();
            };

            this.executor = new Executor( this.context, this.action, this.adapter, options );

            this.executor.execute( inputs, requestor ).catch( done );
        } );
    } );

    describe( 'executor.execute should call functions with right arguments and in right order;', () => {

        beforeEach ( done => {
            this.limiter.try.returns( Promise.resolve( this.authenticatorResult ) );
            this.authenticator.returns( Promise.resolve( this.authenticatorResult ) );
            this.adapter.returns( Promise.resolve( this.adapterResult ) );
            this.dispatcher.dispatch.returns( Promise.resolve() );
            this.notifier.send.returns( Promise.resolve() );

            this.executor = new Executor( this.context, this.action, this.adapter, options );

            this.executor.execute( inputs, requestor ).then( () => done() ).catch( done );
        } );

        describe( 'logger', () => {
            it( 'logger.debug should be called once', () => {
                expect( this.logger.debug.calledOnce ).to.be.true;
            } );

            it( 'logger.debug should be called with (\'Executing [actionName] action\') arguments', () => {
                expect( this.logger.debug.firstCall.calledWithExactly( 'Executing proxy action' ) ).to.be.true;
            } );

            it( 'logger.error should not be called', () => {
                expect( this.logger.error.called ).to.be.false;
            } );
        } );

        describe( 'limiter.try', () => {
            it( 'limiter.try should be called once', () => {
                expect( this.limiter.try.calledOnce ).to.be.true;
            } );

            it( 'limiter.try should be called with daoOptions arguments', () => {
                expect( this.limiter.try.calledWithExactly( `${requestor.scheme}::${requestor.credentials}`, options.rateOptions ) ).to.be.true;
            } );

            it( 'limiter.try should return Promise<Dao>', () => {
                expect( this.limiter.try.firstCall.returnValue ).to.be.instanceof( Promise );
            } );
        } );

        describe( 'database.connect', () => {
            it( 'database.connect should be called once', () => {
                expect( this.database.connect.calledOnce ).to.be.true;
            } );

            it( 'database.connect should be called after limiter.try', () => {
                expect( this.database.connect.calledAfter( this.limiter.try ) ).to.be.true;
            } );

            it( 'database.connect should be called with daoOptions arguments', () => {
                expect( this.database.connect.calledWithExactly( options.daoOptions ) ).to.be.true;
            } );

            it( 'database.connect should return Promise<Dao>', done => {
                expect( this.database.connect.firstCall.returnValue ).to.be.instanceof( Promise );

                this.database.connect.firstCall.returnValue
                    .then( result => {
                        expect( result ).to.be.instanceof( MockDao );
                        done();
                    } )
                    .catch( done );
            } );
        } );

        describe( 'authenticator', () => {
            it( 'authenticator should be called once', () => {
                expect( this.authenticator.calledOnce ).to.be.true;
            } );

            it( 'authenticator should be called after database.connect', () => {
                expect( this.authenticator.calledAfter( this.database.connect ) ).to.be.true;
            } );

            it( 'authenticator should be called with daoOptions arguments', () => {
                expect( this.authenticator.calledWithExactly( requestor, options.authOptions ) ).to.be.true;
            } );

            it( 'authenticator should return Promise<this.authenticatorResult>', done => {
                expect( this.authenticator.firstCall.returnValue ).to.be.instanceof( Promise );

                this.authenticator.firstCall.returnValue
                    .then( result => {
                        expect( result ).to.be.equal( this.authenticatorResult );
                        done();
                    } )
                    .catch( done );
            } );
        } );

        describe( 'adapter', () => {
            it( 'adapter should be called once', () => {
                expect( this.adapter.calledOnce ).to.be.true;
            } );

            it( 'adapter should be called after authenticator', () => {
                expect( this.adapter.calledAfter( this.authenticator ) ).to.be.true;
            } );

            it( 'adapter should be called with (inputs, this.authenticatorResult) arguments', () => {
                expect( this.adapter.calledWithExactly( inputs, this.authenticatorResult ) ).to.be.true;
            } );

            it( 'adapter should return Promise<this.adapterResult>', done => {
                expect( this.adapter.firstCall.returnValue ).to.be.instanceof( Promise );

                this.adapter.firstCall.returnValue
                    .then( result => {
                        expect( result ).to.be.equal( this.adapterResult );
                        done();
                    } )
                    .catch( done );
            } );
        } );

        describe( 'action', () => {
            it( 'action should be called once', () => {
                expect( this.action.calledOnce ).to.be.true;
            } );

            it( 'action should be called after adapter', () => {
                expect( this.action.calledAfter( this.adapter ) ).to.be.true;
            } );

            it( 'action should be called with (this.adapterResult) arguments', () => {
                expect( this.action.calledWithExactly( this.adapterResult ) ).to.be.true;
            } );

            it( 'adapter should return Promise<this.actionResult>', done => {
                expect( this.action.firstCall.returnValue ).to.be.instanceof( Promise );

                this.action.firstCall.returnValue
                    .then( result => {
                        expect( result ).to.be.equal( this.actionResult );
                        done();
                    } )
                    .catch( done );
            } );
        } );

        describe( 'dao.release', () => {
            it( 'dao.release should be called once', () => {
                expect( this.dao.release.calledOnce ).to.be.true;
            } );

            it( 'dao.release should be called after action', () => {
                expect( this.dao.release.calledAfter( this.action ) ).to.be.true;
            } );

            it( 'dao.release should be called with (\'commit\') arguments', () => {
                expect( this.dao.release.calledWithExactly( 'commit' ) ).to.be.true;
            } );

            it( 'dao.release should return Promise<any>', () => {
                expect( this.dao.release.firstCall.returnValue ).to.be.instanceof( Promise );
            } );
        } );

        describe( 'cache.clear', () => {
            it( 'cache.clear should be called once', () => {
                expect( this.cache.clear.calledOnce ).to.be.true;
            } );

            it( 'cache.clear should be called after dao.release', () => {
                expect( this.cache.clear.calledAfter( this.dao.release ) ).to.be.true;
            } );

            it( 'cache.clear should be called with ([\'key1\', \'key2\']) arguments', () => {
                expect( this.cache.clear.calledWithExactly( [ 'key1', 'key2' ] ) ).to.be.true;
            } );
        } );

        describe( 'dispatcher.dispatch', () => {
            it( 'dispatcher.dispatch should be called once', () => {
                expect( this.dispatcher.dispatch.calledOnce ).to.be.true;
            } );

            it( 'dispatcher.dispatch should be called with (this.task) arguments', () => {
                expect( this.dispatcher.dispatch.calledWithExactly( [ this.task ] ) ).to.be.true;
            } );

            it( 'dispatcher.dispatch should return Promise<any>', () => {
                expect( this.dispatcher.dispatch.firstCall.returnValue ).to.be.instanceof( Promise );
            } );
        } );

        describe( 'notifier.send', () => {
            it( 'notifier.send should be called once', () => {
                expect( this.notifier.send.calledOnce ).to.be.true;
            } );

            it( 'notifier.send should be called with (this.notice) arguments', () => {
                expect( this.notifier.send.calledWithExactly( [ this.notice ] ) ).to.be.true;
            } );

            it( 'notifier.send should return Promise<any>', () => {
                expect( this.notifier.send.firstCall.returnValue ).to.be.instanceof( Promise );
            } );
        } );

        describe( 'logger.log', () => {
            it( 'logger.log should be called once', () => {
                expect( this.logger.log.calledOnce ).to.be.true;
            } );

            it( 'logger.log should be called after notifier.send', () => {
                expect( this.logger.log.calledAfter( this.notifier.send ) ).to.be.true;
            } );

            it( 'logger.log should be called with (\'Executed [actionName]\', { time: number }) arguments', () => {
                let args = this.logger.log.firstCall.args;

                expect( args.length ).to.equal( 2 );
                expect( args[ 0 ] ).to.match( /^Executed .+$/ );
                expect( Object.keys( args[ 1 ] ) ).to.deep.equal( [ 'time' ] );
            } );
        } );
    } );

    describe( 'executor.execute should call limiter.try with different arguments;', () => {
        describe( 'when requestor is a string', () => {
            beforeEach ( done => {
                this.executor = new Executor( this.context, this.action, this.adapter, options );

                this.executor.execute( inputs, 'requestor' ).then( () => done() ).catch( done );
            } );

            it( 'limiter.try should be called once', () => {
                expect( this.limiter.try.calledOnce ).to.be.true;
            } );

            it( 'limiter.try should be called with daoOptions arguments', () => {
                expect( this.limiter.try.calledWithExactly( 'requestor', options.rateOptions ) ).to.be.true;
            } );
        } );

        describe( 'when using local scope', () => {
            beforeEach ( done => {
                tmpOptions = Object.assign( {}, options, { rateOptions : { limit: 10, window: 250, scope: 1 } } );

                this.executor = new Executor( this.context, this.action, this.adapter, tmpOptions );

                this.executor.execute( inputs, requestor ).then( () => done() ).catch( done );
            } );

            it( 'limiter.try should be called once', () => {
                expect( this.limiter.try.calledOnce ).to.be.true;
            } );

            it( 'limiter.try should be called with daoOptions arguments', () => {
                expect( this.limiter.try.calledWithExactly( `${requestor.scheme}::${requestor.credentials}::proxy`, tmpOptions.rateOptions ) ).to.be.true;
            } );
        } );

        describe( 'when using global scope', () => {
            beforeEach ( done => {
                tmpOptions = Object.assign( {}, options, { rateOptions : { limit: 10, window: 250, scope: 2 } } );

                this.executor = new Executor( this.context, this.action, this.adapter, tmpOptions );

                this.executor.execute( inputs, requestor ).then( () => done() ).catch( done );
            } );

            it( 'limiter.try should be called once', () => {
                expect( this.limiter.try.calledOnce ).to.be.true;
            } );

            it( 'limiter.try should be called with daoOptions arguments', () => {
                expect( this.limiter.try.calledWithExactly( `${requestor.scheme}::${requestor.credentials}`, tmpOptions.rateOptions ) ).to.be.true;
            } );
        } );
    } );

    describe( 'executor.execute should call dao.release without transaction;', () => {
        beforeEach ( done => {
            tmpOptions = Object.assign( {}, options, { daoOptions : { startTransaction: false } } );

            this.dao      = <Dao> new MockDao( tmpOptions.daoOptions );
            this.database = <Database> { connect: sinon.stub().returns( Promise.resolve( this.dao ) ) };

            sinon.spy( this.dao, 'release' );

            this.context.database = this.database;

            this.executor = new Executor( this.context, this.action, this.adapter, tmpOptions );

            this.executor.execute( inputs, requestor ).then( () => done() ).catch( done );
        } );

        it( 'database.connect should be called with daoOptions arguments', () => {
            expect( this.database.connect.calledWithExactly( tmpOptions.daoOptions ) ).to.be.true;
        } );

        it( 'dao.release should be called with empty arguments', () => {
            expect( this.dao.release.calledWithExactly( undefined ) ).to.be.true;
        } );
    } );

    describe( 'executor.execute should not call cache.clear if cache keys was not provided;', () => {
        beforeEach ( done => {
            this.action = sinon.stub().returns( Promise.resolve() );

            this.executor = new Executor( this.context, this.action, this.adapter, options );

            this.executor.execute( inputs, 'requestor' ).then( () => done() ).catch( done );
        } );

        it( 'cache.clear should not be called', () => {
            expect( this.cache.clear.called ).to.be.false;
        } );
    } );

    describe( 'executor.execute should return error;', () => {
        let errorObj;

        describe( 'authenticator', () => {
            describe( 'if authenticator return error', () => {
                beforeEach ( done => {
                    this.authenticator.throws();

                    this.executor = new Executor( this.context, this.action, this.adapter, tmpOptions );

                    this.executor.execute( inputs, requestor ).then( done ).catch( error => {
                        errorObj = error;
                        done();
                    } );
                } );

                it( 'should return Error', () => {
                    expect( errorObj ).to.be.instanceof( Error );
                } );

                it( 'authenticator should be called once', () => {
                    expect( this.authenticator.calledOnce ).to.be.true;
                } );

                it( 'dao.release should be called with (\'rollback\') arguments', () => {
                    expect( this.dao.release.calledWithExactly( 'rollback' ) ).to.be.true;
                } );
            } );

            describe( 'if authenticator was rejected', () => {
                beforeEach ( done => {
                    this.authenticator.returns( new Promise( ( resolve, reject ) => reject( 'Anauthenticated' ) ) );

                    this.executor = new Executor( this.context, this.action, this.adapter, tmpOptions );

                    this.executor.execute( inputs, requestor ).then( done ).catch( error => {
                        errorObj = error;
                        done();
                    } );
                } );

                it( 'should return Error', () => {
                    expect( errorObj ).to.be.instanceof( Error );
                } );

                it( 'authenticator should be called once', () => {
                    expect( this.authenticator.calledOnce ).to.be.true;
                } );

                it( 'dao.release should be called with (\'rollback\') arguments', () => {
                    expect( this.dao.release.calledWithExactly( 'rollback' ) ).to.be.true;
                } );
            } );
        } );

        describe( 'limiter', () => {
            describe( 'if limiter.try return error', () => {
                beforeEach ( done => {
                    this.limiter.try.throws();

                    this.executor = new Executor( this.context, this.action, this.adapter, tmpOptions );

                    this.executor.execute( inputs, requestor ).then( done ).catch( error => {
                        errorObj = error;
                        done();
                    } );
                } );

                it( 'should return Error', () => {
                    expect( errorObj ).to.be.instanceof( Error );
                } );

                it( 'limiter.try should be called once', () => {
                    expect( this.limiter.try.calledOnce ).to.be.true;
                } );

                it( 'database.connect should be called once', () => {
                    expect( this.database.connect.called ).to.be.false;
                } );

                it( 'dao.release should not be called', () => {
                    expect( this.dao.release.called ).to.be.false;
                } );
            } );

            describe( 'if limiter.try was rejected', () => {
                beforeEach ( done => {
                    this.limiter.try.returns( new Promise( ( resolve, reject ) => reject( 'Rate limit exceeded' ) ) );

                    this.executor = new Executor( this.context, this.action, this.adapter, tmpOptions );

                    this.executor.execute( inputs, requestor ).then( done ).catch( error => {
                        errorObj = error;
                        done();
                    } );
                } );

                it( 'should return Error', () => {
                    expect( errorObj ).to.be.instanceof( Error );
                } );

                it( 'limiter.try should be called once', () => {
                    expect( this.limiter.try.calledOnce ).to.be.true;
                } );

                it( 'database.connect should be called once', () => {
                    expect( this.database.connect.called ).to.be.false;
                } );

                it( 'dao.release should not be called', () => {
                    expect( this.dao.release.called ).to.be.false;
                } );
            } );
        } );

        describe( 'cache', () => {
            describe( 'if cache.clear return error', () => {
                beforeEach ( done => {
                    this.cache.clear.throws();

                    this.executor = new Executor( this.context, this.action, this.adapter, tmpOptions );

                    this.executor.execute( inputs, requestor ).then( done ).catch( error => {
                        errorObj = error;
                        done();
                    } );
                } );

                it( 'should return Error', () => {
                    expect( errorObj ).to.be.instanceof( Error );
                } );

                it( 'this.cache should be called once', () => {
                    expect( this.cache.clear.calledOnce ).to.be.true;
                } );

                it( 'dao.release should be called with (\'commit\') arguments', () => {
                    expect( this.dao.release.calledWithExactly( 'commit' ) ).to.be.true;
                } );
            } );
        } );
    } );
} );

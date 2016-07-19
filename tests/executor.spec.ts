///<reference path="../typings/index.d.ts"/>
import * as chai from 'chai';
import * as sinon from 'sinon';

import { AuthInputs } from './../index';
import { Executor, ExecutorContext, ExecutionOptions } from './../lib/Executor';
import { ActionContext } from './../lib/Action';
import { InternalServerError } from './../lib/errors';

import { authenticate } from './mocks/Authenticator';
import { MockCache } from './mocks/Cache';
import { MockDatabase, MockDao } from './mocks/Database';
import { MockDispatcher } from './mocks/Dispatcher';
import { MockNotifier } from './mocks/Notifier';
import { MockRateLimiter } from './mocks/RateLimiter';
import { MockLogger } from './mocks/Logger';

const expect = chai.expect;

const options: ExecutionOptions = {
    daoOptions : { startTransaction: true },
    rateOptions: { limit: 10, window: 250 }
};

const requestor = { scheme: 'token', credentials: 'testtoken1' };
const inputs    = { firstName: 'John', lastName: 'Smith' };

let context: ExecutorContext;

describe( 'Nova-base tests', () => {

    beforeEach( done => {
        context = {
            authenticator: authenticate,
            database     : new MockDatabase(),
            cache        : new MockCache(),
            dispatcher   : new MockDispatcher(),
            notifier     : new MockNotifier(),
            limiter      : new MockRateLimiter(),
            logger       : new MockLogger(),
            settings     : { count: 5 }
        };

        done();
    } );

    describe( 'Executor Logger', () => {
        it( 'logger.debug and logger.log should be called', done => {
            let executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

            let debugSpy = sinon.spy( executor.logger, 'debug' );
            let logSpy   = sinon.spy( executor.logger, 'log' );
            let infoSpy  = sinon.spy( executor.logger, 'info' );
            let warnSpy  = sinon.spy( executor.logger, 'warn' );
            let errorSpy = sinon.spy( executor.logger, 'error' );

            executor.execute( inputs, requestor )
                .then( result => {
                    try {
                        expect( debugSpy.called ).to.be.true;
                        expect( logSpy.called ).to.be.true;
                        expect( infoSpy.called ).to.be.false;
                        expect( warnSpy.called ).to.be.false;
                        expect( errorSpy.called ).to.be.false;

                        expect( debugSpy.callCount ).to.equal( 2 );
                        expect( logSpy.callCount ).to.equal( 1 );

                        expect( debugSpy.firstCall.args.length ).to.equal( 1 );
                        expect( debugSpy.firstCall.args[ 0 ] ).to.equal( 'Executing helloWorldAction action' );

                        expect( debugSpy.secondCall.args.length ).to.equal( 1 );
                        expect( debugSpy.secondCall.args[ 0 ] ).to.equal( 'Authenticated user1 via token' );

                        expect( logSpy.calledAfter( debugSpy ) ).to.be.true;
                        expect( logSpy.firstCall.args.length ).to.equal( 2 );
                        expect( logSpy.firstCall.args[ 0 ] ).to.equal( 'Executed helloWorldAction' );
                        expect( Object.keys( logSpy.firstCall.args[ 1 ] ) ).to.deep.equal( [ 'time' ] );

                        done();
                    } catch ( error ) {
                        done( error );
                    }
                } )
                .catch( done );
        } );

        it( 'no one logger method should be called', done => {
            let executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

            let debugSpy = sinon.spy( executor.logger, 'debug' );
            let logSpy   = sinon.spy( executor.logger, 'log' );
            let infoSpy  = sinon.spy( executor.logger, 'info' );
            let warnSpy  = sinon.spy( executor.logger, 'warn' );
            let errorSpy = sinon.spy( executor.logger, 'error' );

            delete executor.logger;

            executor.execute( inputs, requestor )
                .then( result => {
                    try {
                        expect( debugSpy.called ).to.be.false;
                        expect( logSpy.called ).to.be.false;
                        expect( infoSpy.called ).to.be.false;
                        expect( warnSpy.called ).to.be.false;
                        expect( errorSpy.called ).to.be.false;

                        done();
                    } catch ( error ) {
                        done( error );
                    }
                } )
                .catch( done );
        } );

        it( 'logger.error should be called', done => {
            let executor = new Executor( context, helloWorldAction, helloWorldRejectedAdapter, options );

            let errorSpy = sinon.spy( executor.logger, 'error' );

            executor.execute(  inputs, requestor )
                .then( result => {
                    done( 'should return error' );
                } )
                .catch( () => {
                    try {
                        expect( errorSpy.called ).to.be.true;
                        expect( errorSpy.callCount ).to.equal( 1 );

                        expect( errorSpy.firstCall.args.length ).to.equal( 1 );
                        expect( errorSpy.firstCall.args[ 0 ] ).to.be.instanceof( InternalServerError );

                        done();
                    } catch ( error ) {
                        done( error );
                    }
                } );
        } );
    } );

    describe( 'Executor Database', () => {
        it( 'database.connect should be called once', done => {
            let executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

            let dbSpy = sinon.spy( executor.database, 'connect' );

            executor.execute( inputs, requestor )
                .then( result => {
                    try {
                        expect( dbSpy.called ).to.be.true;
                        expect( dbSpy.calledOnce ).to.be.true;

                        expect( dbSpy.calledWith( options.daoOptions ) ).to.be.true;
                        expect( dbSpy.firstCall.returnValue ).to.be.instanceof( Promise );

                        done();
                    } catch ( error ) {
                        done( error );
                    }
                } )
                .catch( done );
        } );

        it( 'db dao.release should be called once with (\'commit\') arg', done => {
            let mockDao  = new MockDao( { startTransaction: true } );
            let executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

            let dbStub = sinon.stub( executor.database, 'connect' );
            let daoSpy = sinon.spy( mockDao, 'release' );

            dbStub.returns( Promise.resolve( mockDao ) );

            executor.execute( inputs, requestor )
                .then( result => {
                    try {
                        expect( daoSpy.called ).to.be.true;
                        expect( daoSpy.calledOnce ).to.be.true;

                        expect( daoSpy.calledWith( 'commit' ) ).to.be.true;
                        expect( daoSpy.firstCall.returnValue ).to.be.instanceof( Promise );

                        done();
                    } catch ( error ) {
                        done( error );
                    }
                } )
                .catch( done );
        } );

        it( 'db dao.release should be called once with empty arg', done => {
            let mockDao  = new MockDao( { startTransaction: false } );
            let executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

            let dbStub = sinon.stub( executor.database, 'connect' );
            let daoSpy = sinon.spy( mockDao, 'release' );

            dbStub.returns( Promise.resolve( mockDao ) );

            executor.execute( inputs, requestor )
                .then( result => {
                    try {
                        expect( daoSpy.called ).to.be.true;
                        expect( daoSpy.calledOnce ).to.be.true;

                        expect( daoSpy.calledWith() ).to.be.true;
                        expect( daoSpy.firstCall.returnValue ).to.be.instanceof( Promise );

                        done();
                    } catch ( error ) {
                        done( error );
                    }
                } )
                .catch( done );
        } );

        it( 'db dao.release should be called once (\'rollback\') arg', done => {
            let mockDao  = new MockDao( { startTransaction: true } );
            let executor = new Executor( context, helloWorldAction, helloWorldRejectedAdapter, options );

            let dbStub = sinon.stub( executor.database, 'connect' );
            let daoSpy = sinon.spy( mockDao, 'release' );

            dbStub.returns( Promise.resolve( mockDao ) );

            executor.execute(  inputs, requestor )
                .then( result => {
                    done( 'should return error' );
                } )
                .catch( () => {
                    try {
                        expect( daoSpy.called ).to.be.true;
                        expect( daoSpy.calledOnce ).to.be.true;

                        expect( daoSpy.calledWith( 'rollback' ) ).to.be.true;
                        expect( daoSpy.firstCall.returnValue ).to.be.instanceof( Promise );

                        done();
                    } catch ( error ) {
                        done( error );
                    }
                } );
        } );
    } );

    describe( 'Executor Authenticator', () => {
        it( 'authenticator should be called once', done => {
            let executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

            let authSpy = sinon.spy( executor, 'authenticator' );

            executor.execute( inputs, requestor )
                .then( result => {
                    try {
                        expect( authSpy.called ).to.be.true;
                        expect( authSpy.calledOnce ).to.be.true;

                        expect( authSpy.calledWith( requestor ) ).to.be.true;
                        expect( authSpy.firstCall.returnValue ).to.be.instanceof( Promise );

                        done();
                    } catch ( error ) {
                        done( error );
                    }
                } )
                .catch( done );
        } );

        it( 'authenticator should return user1', done => {
            let executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

            let authSpy = sinon.spy( executor, 'authenticator' );

            executor.execute( inputs, requestor )
                .then( result => {
                    try {
                        expect( authSpy.calledOnce ).to.be.true;
                        expect( authSpy.firstCall.returnValue ).to.be.instanceof( Promise );

                        authSpy.firstCall.returnValue
                            .then( data => {
                                expect( data ).to.equal( 'user1' );

                                done();
                            } )
                            .catch( done );

                    } catch ( error ) {
                        done( error );
                    }
                } )
                .catch( done );
        } );

        it( 'authenticator should return user2', done => {
            let executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

            let authSpy = sinon.spy( executor, 'authenticator' );

            executor.execute( inputs, { scheme: 'token', credentials: 'testtoken2' } )
                .then( result => {
                    try {
                        expect( authSpy.calledOnce ).to.be.true;
                        expect( authSpy.firstCall.returnValue ).to.be.instanceof( Promise );

                        authSpy.firstCall.returnValue
                            .then( data => {
                                expect( data ).to.equal( 'user2' );

                                done();
                            } )
                            .catch( done );

                    } catch ( error ) {
                        done( error );
                    }
                } )
                .catch( done );
        } );

        it( 'authenticator should return empty result', done => {
            let executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

            let authSpy = sinon.spy( executor, 'authenticator' );

            executor.execute( inputs, { scheme: 'key', credentials: 'testkey' } )
                .then( result => {
                    try {
                        expect( authSpy.calledOnce ).to.be.true;
                        expect( authSpy.firstCall.returnValue ).to.be.instanceof( Promise );

                        authSpy.firstCall.returnValue
                            .then( data => {
                                expect( data ).to.be.undefined;

                                done();
                            } )
                            .catch( done );

                    } catch ( error ) {
                        done( error );
                    }
                } )
                .catch( done );
        } );
    } );

    describe( 'Executor Adapter', () => {
        it( 'executor.adapter should be called once', done => {
            let executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

            let adapterSpy = sinon.spy( executor, 'adapter' );

            executor.execute( inputs, requestor )
                .then( result => {
                    try {
                        expect( adapterSpy.called ).to.be.true;
                        expect( adapterSpy.calledOnce ).to.be.true;

                        expect( adapterSpy.calledWith( inputs, 'user1' ) ).to.be.true;
                        expect( adapterSpy.firstCall.returnValue ).to.be.instanceof( Promise );

                        done();
                    } catch ( error ) {
                        done( error );
                    }
                } )
                .catch( done );
        } );

        it( 'executor.adapter should return right object for \'user1\'', done => {
            let executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

            let adapterSpy = sinon.spy( executor, 'adapter' );

            executor.execute( inputs, requestor )
                .then( result => {
                    try {
                        expect( adapterSpy.calledOnce ).to.be.true;
                        expect( adapterSpy.calledWith( inputs, 'user1' ) ).to.be.true;

                        adapterSpy.firstCall.returnValue
                            .then( data => {
                                expect( data ).to.deep.equal( { token: 'user1', name: `${inputs.firstName} ${inputs.lastName}` } );

                                done();
                            } )
                            .catch( done );
                    } catch ( error ) {
                        done( error );
                    }
                } )
                .catch( done );
        } );

        it( 'executor.adapter should return right object for \'user2\'', done => {
            let executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

            let adapterSpy = sinon.spy( executor, 'adapter' );

            executor.execute( inputs, { scheme: 'token', credentials: 'testtoken2' } )
                .then( result => {
                    try {
                        expect( adapterSpy.calledOnce ).to.be.true;
                        expect( adapterSpy.calledWith( inputs, 'user2' ) ).to.be.true;

                        adapterSpy.firstCall.returnValue
                            .then( data => {
                                expect( data ).to.deep.equal( { token: 'user2', name: `${inputs.firstName} ${inputs.lastName}` } );

                                done();
                            } )
                            .catch( done );
                    } catch ( error ) {
                        done( error );
                    }
                } )
                .catch( done );
        } );

        it( 'executor.adapter should return right object for empty user', done => {
            let executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

            let adapterSpy = sinon.spy( executor, 'adapter' );

            executor.execute( inputs, { scheme: 'key', credentials: 'testkey' } )
                .then( result => {
                    try {
                        expect( adapterSpy.calledOnce ).to.be.true;
                        expect( adapterSpy.calledWith( inputs ) ).to.be.true;

                        adapterSpy.firstCall.returnValue
                            .then( data => {
                                expect( data ).to.deep.equal( { token: undefined, name: `${inputs.firstName} ${inputs.lastName}` } );

                                done();
                            } )
                            .catch( done );
                    } catch ( error ) {
                        done( error );
                    }
                } )
                .catch( done );
        } );
    } );

    describe( 'Executor Action', () => {
        it( 'executor.action should be called once with right arguments for user1', done => {
            let executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

            let actionSpy = sinon.spy( executor, 'action' );

            executor.execute( inputs, requestor )
                .then( result => {
                    try {
                        expect( actionSpy.called ).to.be.true;
                        expect( actionSpy.calledOnce ).to.be.true;

                        expect( actionSpy.calledWith( { token: 'user1', name: 'John Smith' } ) ).to.be.true;
                        expect( actionSpy.firstCall.returnValue ).to.be.instanceof( Promise );

                        done();
                    } catch ( error ) {
                        done( error );
                    }
                } )
                .catch( done );
        } );

        it( 'executor.action should be called once with right arguments for user2', done => {
            let executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

            let actionSpy = sinon.spy( executor, 'action' );

            executor.execute( inputs, { scheme: 'token', credentials: 'testtoken2' } )
                .then( result => {
                    try {
                        expect( actionSpy.called ).to.be.true;
                        expect( actionSpy.calledOnce ).to.be.true;

                        expect( actionSpy.calledWith( { token: 'user2', name: 'John Smith' } ) ).to.be.true;
                        expect( actionSpy.firstCall.returnValue ).to.be.instanceof( Promise );

                        done();
                    } catch ( error ) {
                        done( error );
                    }
                } )
                .catch( done );
        } );

        it( 'executor.action should be called once with right arguments for empty user', done => {
            let executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

            let actionSpy = sinon.spy( executor, 'action' );

            executor.execute( inputs, { scheme: 'key', credentials: 'testkey' } )
                .then( result => {
                    try {
                        expect( actionSpy.called ).to.be.true;
                        expect( actionSpy.calledOnce ).to.be.true;

                        expect( actionSpy.calledWith( { token: undefined, name: 'John Smith' } ) ).to.be.true;
                        expect( actionSpy.firstCall.returnValue ).to.be.instanceof( Promise );

                        done();
                    } catch ( error ) {
                        done( error );
                    }
                } )
                .catch( done );
        } );
    } );
} );

// helpers
function helloWorldAdapter(this: ActionContext, inputs: any, token: string): Promise<{ name: string, token: string }> {
    return Promise.resolve({
        token: token,
        name : `${inputs.firstName} ${inputs.lastName}`
    });
}

function helloWorldRejectedAdapter(this: ActionContext, inputs: any, token: string): Promise<any> {
    return new Promise( ( resolve, reject ) => {
        reject();
    } );
}

function helloWorldAction(this: ActionContext, inputs: { token: string, name: string }): Promise<string> {
    return Promise.resolve(`Hello, my name is ${inputs.name}, count=${this.settings.count}, token=${inputs.token}`);
}

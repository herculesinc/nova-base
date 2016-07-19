///<reference path="../typings/index.d.ts"/>
import * as chai from 'chai';
import * as sinon from 'sinon';
console.log( __dirname)
import { AuthInputs } from './index';
import { Executor, ExecutorContext, ExecutionOptions } from './../lib/Executor';
import { ActionContext } from './../lib/Action';

import { authenticate } from './mocks/Authenticator';
import { MockCache } from './mocks/Cache';
import { MockDatabase } from './mocks/Database';
import { MockDispatcher } from './mocks/Dispatcher';
import { MockNotifier } from './mocks/Notifier';
import { MockRateLimiter } from './mocks/RateLimiter';
import { MockLogger } from './mocks/Logger';

const expect = chai.expect;

const options: ExecutionOptions = {
    daoOptions: { startTransaction: true },
    rateOptions: { limit: 10, window: 250 }
};

let executor;

describe( 'My context', () => {

    before( done => {
        const context: ExecutorContext = {
            authenticator: authenticate,
            database     : new MockDatabase(),
            cache        : new MockCache(),
            dispatcher   : new MockDispatcher(),
            notifier     : new MockNotifier(),
            limiter      : new MockRateLimiter(),
            logger       : new MockLogger(),
            settings     : { count: 5 }
        };

        executor = new Executor( context, helloWorldAction, helloWorldAdapter, options );

        done();
    } );

    describe( 'Some event', () => {
        it( 'should result in something', () => {
            executor.execute({ firstName: 'John', lastName: 'Smith'}, { scheme: 'token', credentials: 'testtoken1'})
                .then((result) => {
                    expect(true).to.eq(true);
                });
        } );
    } );
} );

// helpers
function helloWorldAdapter(this: ActionContext, inputs: any, token: string): Promise<{ name: string, token: string }> {
    return Promise.resolve({
        token   : token,
        name    : `${inputs.firstName} ${inputs.lastName}`
    });
}

function helloWorldAction(this: ActionContext, inputs: { token: string, name: string }): Promise<string> {
    return Promise.resolve(`Hello, my name is ${inputs.name}, count=${this.settings.count}, token=${inputs.token}`);
}

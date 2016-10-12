// IMPORTS
// ================================================================================================
import { AuthInputs } from './../index';
import { Executor, ExecutorContext, ExecutionOptions } from './../lib/Executor';
import { ActionContext } from './../lib/Action';

import { authenticator, Token } from './mocks/Authenticator';
import { MockCache } from './mocks/Cache';
import { MockDatabase } from './mocks/Database';
import { MockDispatcher } from './mocks/Dispatcher';
import { MockNotifier } from './mocks/Notifier';
import { MockRateLimiter } from './mocks/RateLimiter';
import { MockLogger } from './mocks/Logger';

// SETUP
// ================================================================================================
const context: ExecutorContext = {
    authenticator   : authenticator,
    database        : new MockDatabase(),
    cache           : new MockCache(),
    dispatcher      : new MockDispatcher(),
    notifier        : new MockNotifier(),
    limiter         : new MockRateLimiter(),
    logger          : new MockLogger(),
    settings: {
        count       : 5
    }
};

const testTag = Symbol();

const options: ExecutionOptions = {
    daoOptions: { startTransaction: true },
    rateLimits: { limit: 10, window: 250 }
};

function helloWorldAdapter(this: ActionContext, inputs: any, token: Token): Promise<{ name: string, user: string }> {
    return Promise.resolve({
        user    : token.username,
        name    : `${inputs.firstName} ${inputs.lastName}`
    });
}

async function helloWorldAction(this: ActionContext, inputs: { user: string, name: string }): Promise<string> {
    this.defer(deferredAction, { message: 'test message'});
    
    // sould execute inner action
    await this.run(innerAction, { message: 'test1 message'});

    // should not execute inner action
    this.suppress(innerAction, testTag);
    await this.run(innerAction, { message: 'test2 message'});
    this.unsuppress(innerAction, testTag);

    // should execute inner action
    await this.run(innerAction, { message: 'test3 message'});

    return `Hello, my name is ${inputs.name}, count=${this.settings.count}, user=${inputs.user}`;
}

function deferredAction(this: ActionContext, inputs: { message: string }): Promise<void> {
    console.log(`Deferred: ${inputs.message}`);
    return Promise.resolve();
}

function innerAction(this: ActionContext, inputs: { message: string }): Promise<void> {
    console.log(`Inner: ${inputs.message}`);
    return Promise.resolve();
}

const executor = new Executor(context, helloWorldAction, helloWorldAdapter, options);

// TESTS
// ================================================================================================
executor.execute({ firstName: 'John', lastName: 'Smith'}, { username: 'user1', password: 'password1'})
    .then((result) => {
        console.log(result);
    });
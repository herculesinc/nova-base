// IMPORTS
// ================================================================================================
import { RateLimiter, RateOptions } from './../../index';
import { Exception } from './../../lib/errors';
import { HttpStatusCode } from './../../lib/util';

// RATEL LIMIT ERRROR
// ================================================================================================
export class RateLimitError extends Exception {
    id          : string;
    retryAfter  : number;

    constructor(id: string, retryAfter: number) {
        super(`Rate limit exceeded for {${id}}`, HttpStatusCode.TooManyRequests);

        this.id = id;
        this.retryAfter = retryAfter;
    }
}

// RATE LIMITER CLASS
// ================================================================================================
export class MockRateLimiter implements RateLimiter {

    errorKeys: Set<string>;

    constructor(errorKeys?: string[]) {
        this.errorKeys = new Set(errorKeys);
    }

    try(id: string, options: RateOptions): Promise<any> {
        // console.log(`Checking rate limit for {${id}} with options ${JSON.stringify(options)}`);
        return this.errorKeys.has(id) ?  Promise.reject(new RateLimitError(id, 123)) : Promise.resolve();
    }
}

// MODULE VARIABLES
// ================================================================================================
const INT_REGEX = /^[-+]?[0-9]+$/;
const NUM_REGEX = /^[-+]?[0-9]+(?:\.[0-9]+)?$/;

// INTERFACES
// ================================================================================================
export interface Comparator<T> {
    (v1: T, v2: T): boolean;
}

// TIMER
// ================================================================================================
export function since(start: number[]) {
    const diff = process.hrtime(start);
    return (diff[0] * 1000 + Math.floor(diff[1] / 1000000));
}

// ARRAYS
// ================================================================================================
export function cleanArray(source: any[]): any[] {
    if (!source) return undefined;
    const target = [];
    for (let value of source) {
        if (value !== undefined && value !== null) {
            target.push(value);
        }
    }
    return target;
}

export function areArraysEqual<T>(a1: T[], a2: T[], strict = true, comparator?: (v1: T, v2: T) => boolean): boolean {
    if (a1 == a2) return true;
    if (!a1 || !a2) return false;
    if (a1.length !== a2.length) return false;

    if (strict) {
        if (comparator) {
            // simple array comparision, using custom comparator
            for (let i = 0; i < a1.length; i++) {
                if (!comparator(a1[i], a2[i])) return false;
            }
        }
        else {
            // simple array comparision, using strict equality
            for (let i = 0; i < a1.length; i++) {
                if (a1[i] !== a2[i]) return false;
            }
        }        
    }
    else {
        if (comparator) {
            // set-based comparision, using custom comparator
            for (let v1 of a1) {
                let found = false;
                for (let v2 of a2) {
                    if (comparator(v1,v2)) {
                        found = true;
                        break;
                    }
                }

                if (!found) return false;
            }
        }
        else {
            // set-based comparison, using strict equality
            for (let v1 of a1) {
                let found = false;
                for (let v2 of a2) {
                    if (v1 === v2) {
                        found = true;
                        break;
                    }
                }

                if (!found) return false;
            }
        }
    }

    return true;
}

// PARSERS
// ================================================================================================
export function parseInteger(value: any, min?: number, max?: number): number {
    let num: number;

    // parse the value
    if (typeof value === 'string') {
        value = value.trim();
        if (!INT_REGEX.test(value)) {
            return new TypeError(`'${value}' is not a valid integer`) as any;
        }
        num = Number.parseInt(value, 10);
    }
    else if (typeof value === 'number') {
        if (!Number.isInteger(value)) {
            return new TypeError(`'${value}' is not a valid integer`) as any;
        }
        num = value;
    }
    else {
        return new TypeError(`'${value}' is not a valid integer`) as any;
    }

    // validate min boundary
    if (min !== null && min !== undefined && num < min) {
        return new TypeError(`value cannot be smaller than ${min}`) as any;
    }

    // validate max boundary
    if (max !== null && max !== undefined && num > max) {
        return new TypeError(`value cannot be greater than ${max}`) as any;
    }

    return num;
}

export function parseNumber(value: any, min?: number, max?: number): number {
    var num: number;

    // parse the value
    if (typeof value === 'string') {
        value = value.trim();
        if (!NUM_REGEX.test(value)) {
            return new TypeError(`'${value}' is not a valid number`) as any;
        }
        num = Number.parseFloat(value);
    }
    else if (typeof value === 'number') {
        num = value;
    }
    else {
        return new TypeError(`'${value}' is not a valid number`) as any;
    }

    // validate min boundary
    if (min !== null && min !== undefined && num < min) {
        return new TypeError(`value cannot be smaller than ${min}`) as any;
    }

    // validate max boundary
    if (max !== null && max !== undefined && num > max) {
        return new TypeError(`value cannot be greater than ${max}`) as any;
    }

    return num;
}

export function parseBoolean(value: any, strict = true): boolean {
    if (strict) {
        if (typeof value === 'string') {
            value = value.trim().toLowerCase();
            if (value === 'true') return true;
            if (value === 'false') return false;
            return new TypeError(`'${value}' is not a valid boolean`) as any;
        }
        else if (typeof value === 'boolean') {
            return value;
        }
        else {
            return new TypeError(`'${value}' is not a valid boolean`) as any;
        }
    }
    else {
        return (!!value);
    }
}

export function parseDate(value: any, paramName?: string): Date {
    var date;
    
    if (typeof value === 'string') {
        value = value.trim();
        if (INT_REGEX.test(value)) {
            date = new Date(Number.parseInt(value, 10));
        }
        else {
            date = new Date(value);   
        }
    }
    else if (typeof value === 'number') {
        date = new Date(value);
    }
    else {
        if (value && value instanceof Date) {
            date = value;
        }
        else {
            date = new Date(value);
        }
    }
    
    if (Number.isNaN(date.valueOf())) {
        return new TypeError(`'${value}' is not a valid date`) as any;
    }
    
    return date;
}

export function parseString(value: any, minLength?: number, maxLength?: number): string {
    if (value === null || value === undefined) {
        return minLength ? new TypeError(`value is missing`) as any : undefined;
    }
    else if (value === '') {
        return minLength 
            ? new TypeError(`value must be at least ${minLength} characters long`) as any
            : undefined;
    }

    if (typeof value === 'string') {
        value = value.trim();

        if (minLength && value.length < minLength) {
            return new TypeError(`value must be at least ${minLength} characters long`) as any;
        }

        if (maxLength && value.length > maxLength) {
            return new TypeError(`value can be at most ${maxLength} characters long`) as any;
        }

        return value || undefined;
    }
    else {
        return new TypeError(`value '${value}' is not a string`) as any;
    }
}

// HTTP CODES
// ================================================================================================
export enum HttpStatusCode {
    OK                  = 200,
    Created             = 201,
    Accepted            = 202,
    NoContent           = 204,
    BadRequest          = 400, 
    Unauthorized        = 401,
    InvalidInputs       = 402,
    Forbidden           = 403,
    NotFound            = 404,
    NotAllowed          = 405,
    NotAcceptable       = 406,
    PayloadTooLarge     = 413,
    UnsupportedContent  = 415,
    NotReady            = 425,
    TooManyRequests     = 429,
    InternalServerError = 500,
    NotImplemented      = 501,
    ServiceUnavailable  = 503
}

export const HttpCodeNames = new Map([
    [ 200, 'OK' ],
    [ 201, 'Created' ],
    [ 202, 'Accepted' ],
    [ 204, 'No Content' ],
    [ 400, 'Bad Request' ],
    [ 401, 'Unauthorized' ],
    [ 402, 'Invalid Inputs' ],
    [ 403, 'Forbidden' ],
    [ 404, 'Not Found' ],
    [ 405, 'Method Not Allowed' ],
    [ 406, 'Not Acceptable' ],
    [ 413, 'Payload Too Large' ],
    [ 415, 'Unsupported Media Type' ],
    [ 425, 'Not Ready' ],
    [ 429, 'Too Many Requests' ],
    [ 500, 'Internal Server Error' ],
    [ 501, 'Not Implemented' ],
    [ 503, 'Service Unavailable' ],
]);

// DUMMY FUNCTIONS
// ================================================================================================
export function noop() {};
// IMPORTS
// ================================================================================================
import { HttpStatusCode, HttpCodeNames } from './util';

// INTERFACES
// ================================================================================================
export interface ExceptionOptions {
    status?     : number;
    message?    : string;
    code?       : number;
    cause?      : Error;
    stackStart? : Function;
    allowCommit?: boolean;
}

// BASE EXCEPTION CLASS
// ================================================================================================
export class Exception extends Error {
    name        : string;
    status      : number;
    headers?    : { [index: string]: string };
    code?       : number;
    cause?      : Error;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(options: ExceptionOptions)
    constructor(message: string, status: number)
    constructor(messageOrOptions: string | ExceptionOptions, status?: number) {
        if (typeof messageOrOptions === 'string') {
            super(messageOrOptions);
            this.status = (typeof status !== 'number' || status < 400 || status > 599)
                ? HttpStatusCode.InternalServerError : status;
            Error.captureStackTrace(this, this.constructor);
        }
        else {
            super(messageOrOptions.message);
            status = messageOrOptions.status;
            this.status = (typeof status !== 'number' || status < 400 || status > 599)
                ? HttpStatusCode.InternalServerError : status;
            this.code = messageOrOptions.code;
            this.cause = messageOrOptions.cause;

            if (this.cause) {
                this.message = this.message 
                    ? `${this.message}: ${this.cause.message}` 
                    : this.cause.message;
            }

            Error.captureStackTrace(this, messageOrOptions.stackStart || this.constructor);
        }

        this.name = HttpCodeNames.get(this.status) || 'Unknown Error';
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    get isClientError(): boolean {
        return (this.status >= 400 && this.status < 500);
    }

    get isServerError(): boolean {
        return (this.status >= 500 && this.status < 600);
    }

    toJSON(): any {
        return {
            name    : this.name,
            code    : this.code,
            message : this.message
        };
    }
}

// DERIVED ERROR CLASSESS
// ================================================================================================
export class TooBusyError extends Exception {
    constructor(message?: string) {
        super(message || 'The server is too busy', HttpStatusCode.ServiceUnavailable);
    }
}

export class InvalidEndpointError extends Exception {
    constructor(path: string) {
        super(`Endpoint for ${path} does not exist`, HttpStatusCode.NotFound);
        this.name = 'Invalid Endpoint';
    }
}

export class UnsupportedMethodError extends Exception {
    constructor(method: string, path: string) {
        super(`Method ${method} is not supported for ${path} endpoint`, HttpStatusCode.NotAllowed);
    }
}

// PUBLIC FUNCTIONS
// ================================================================================================
export function wrapMessage(error: Error, message: string): Error {
    if (!error) return undefined;
    if (!message) return error;

    error.message = `${message}: ${error.message}`;
    return error;
}

export function isError(value: any): value is Error {
    if (!value) return false;
    return (value instanceof Error);
}
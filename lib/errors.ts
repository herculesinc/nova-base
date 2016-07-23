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
}

// BASE EXCEPTION CLASS
// ================================================================================================
export class Exception extends Error {
    name    : string;
    status  : number;
    code?   : number;
    cause?  : Error;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(options: ExceptionOptions)
    constructor(message: string, status: number)
    constructor(messageOrOptions: string | ExceptionOptions, status?: number) {
        if (typeof messageOrOptions === 'string') {
            super(messageOrOptions);
            this.status = status || HttpStatusCode.InternalServerError;
            Error.captureStackTrace(this, this.constructor);
        }
        else {
            super(messageOrOptions.message);
            this.status = messageOrOptions.status || HttpStatusCode.InternalServerError;
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


// PUBLIC FUNCTIONS
// ================================================================================================
export function wrapMessage(error: Error, message: string): Error {
    if (!error) return undefined;
    if (!message) return error;

    error.message = `${message}: ${error.message}`;
    return error;
}
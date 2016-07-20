// IMPORTS
// ================================================================================================
import { HttpStatusCode, HttpCodeNames } from './util';

// CLIENT ERROR
// ================================================================================================
export class ClientError extends Error {
	name    : string;
	status  : number;
    code?   : number;

    constructor(message: string, status?: number);
    constructor(descriptor: [number, string], status?: number);
	constructor(messageOrDescriptor: string | [number, string], status?: number) {
        if (Array.isArray(messageOrDescriptor)) {
            super(messageOrDescriptor[1]);
            this.code = messageOrDescriptor[0];
        }
        else {
            super(messageOrDescriptor);
        }
        
        this.status = status || HttpStatusCode.BadRequest;
		this.name = HttpCodeNames.get(this.status) || 'Unknown Error';
        Error.captureStackTrace(this, this.constructor);
	}

    toJSON(): any {
        return {
            name    : this.name,
            code    : this.code,
            message : this.message
        };
    }
}

// SERVER ERRORS
// ================================================================================================
export class ServerError extends Error {
    name        : string;
	status      : number;
    cause?      : Error;

    constructor(message: string, status?: number);
    constructor(message: string, cause?: Error, status?: number);
	constructor(message: string, causeOrStatus?: Error | number, status?: number) {
        super(message);

        if (typeof causeOrStatus === 'number') {
            this.status = causeOrStatus;
        }
        else {
			this.status = status || HttpStatusCode.InternalServerError;
            this.cause = causeOrStatus;
		}
        this.name = HttpCodeNames.get(this.status) || 'Unknown Error';

        Error.captureStackTrace(this, this.constructor);
	}

    toJSON(): any {
        const cause = this.cause && this.cause instanceof ServerError 
            ? this.cause : this.cause.message;

        return {
            name    : this.name,
            message : this.message,
            cause   : cause 
        };
    }
}
// IMPORTS
// ================================================================================================
import { HttpStatusCode, HttpCodeNames } from './util';

// CLIENT ERROR
// ================================================================================================
export class ClientError extends Error {
	name    : string;
	status  : number;
    // TODO: add code property

	constructor(message: string, status?: number) {
        super(message);
        this.status = status || HttpStatusCode.BadRequest;
		this.name = HttpCodeNames.get(this.status) || 'Unknown Error';
        Error.captureStackTrace(this, this.constructor);
	}

    getBody(): any {
        return {
            name    : this.name,
            message : this.message
        };
    }

    getHeaders(): any {
        return undefined;
    }
}

// SERVER ERROR
// ================================================================================================
export class InternalServerError extends Error {
	name        : string;
	status      : number;
    cause       : Error;
    isCritical  : boolean;
    
    constructor(cause: Error, isCritical?: boolean);
    constructor(message: string, isCritical?: boolean, cause?: Error);
	constructor(messageOrCause: string | Error, isCritical?: boolean, cause?: Error) {
        if (typeof messageOrCause === 'string') {
			super(cause ? `${messageOrCause}: ${cause.message}` : messageOrCause);
			this.cause = cause;
		}
		else {
			super(messageOrCause.message);
			this.cause = messageOrCause;
		}

        this.status = HttpStatusCode.InternalServerError;
		this.name = HttpCodeNames.get(this.status);
        this.isCritical = typeof isCritical === 'boolean' ? isCritical : false;
        Error.captureStackTrace(this, this.constructor);
	}

    getBody(): any {
        // TODO: improve content generation
        return {
            message : this.message,
            cause   : this.cause
        };
    }
}
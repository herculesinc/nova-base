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
export class ServerError extends Error {
	name    : string;
	status  : number;

	constructor(message: string, status?: number) {
        super(message);
        this.status = status || HttpStatusCode.InternalServerError;
		this.name = HttpCodeNames.get(this.status) || 'Unknown Error';
        Error.captureStackTrace(this, this.constructor);
	}

    getBody(): any {
        return {
            name    : this.name,
            message : this.message
        };
    }
}

export class InternalServerError extends ServerError {
    cause       : Error;
    isCritical  : boolean;
    
    constructor(message: string, isCritical?: boolean);
    constructor(message: string, cause?: Error, isCritical?: boolean);
	constructor(message: string, causeOrCritical?: Error | boolean, isCritical?: boolean) {
        super(message);

        if (!causeOrCritical) {
            this.isCritical = false;
        }
        else if (typeof causeOrCritical === 'boolean') {
			this.isCritical = causeOrCritical;
		}
		else {
			this.cause = causeOrCritical;
            this.isCritical = typeof isCritical === 'boolean' ? isCritical : false;
		}
	}

    getBody(): any {
        // TODO: improve content generation
        return {
            message : this.message,
            cause   : this.cause
        };
    }
}
"use strict";
// IMPORTS
// ================================================================================================
const util_1 = require('./util');
// CLIENT ERROR
// ================================================================================================
class ClientError extends Error {
    // TODO: add code property
    constructor(message, status) {
        super(message);
        this.status = status || util_1.HttpStatusCode.BadRequest;
        this.name = util_1.HttpCodeNames.get(this.status) || 'Unknown Error';
        Error.captureStackTrace(this, this.constructor);
    }
    getBody() {
        return {
            name: this.name,
            message: this.message
        };
    }
    getHeaders() {
        return undefined;
    }
}
exports.ClientError = ClientError;
// SERVER ERROR
// ================================================================================================
class ServerError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status || util_1.HttpStatusCode.InternalServerError;
        this.name = util_1.HttpCodeNames.get(this.status) || 'Unknown Error';
        Error.captureStackTrace(this, this.constructor);
    }
    getBody() {
        return {
            name: this.name,
            message: this.message
        };
    }
}
exports.ServerError = ServerError;
class InternalServerError extends ServerError {
    constructor(message, causeOrCritical, isCritical) {
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
    getBody() {
        // TODO: improve content generation
        return {
            message: this.message,
            cause: this.cause
        };
    }
}
exports.InternalServerError = InternalServerError;
//# sourceMappingURL=errors.js.map
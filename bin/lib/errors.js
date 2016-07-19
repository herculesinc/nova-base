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
class InternalServerError extends Error {
    constructor(messageOrCause, isCritical, cause) {
        if (typeof messageOrCause === 'string') {
            super(cause ? `${messageOrCause}: ${cause.message}` : messageOrCause);
            this.cause = cause;
        }
        else {
            super(messageOrCause.message);
            this.cause = messageOrCause;
        }
        this.status = util_1.HttpStatusCode.InternalServerError;
        this.name = util_1.HttpCodeNames.get(this.status);
        this.isCritical = typeof isCritical === 'boolean' ? isCritical : false;
        Error.captureStackTrace(this, this.constructor);
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
"use strict";
// IMPORTS
// ================================================================================================
const util_1 = require('./util');
// CLIENT ERROR
// ================================================================================================
class ClientError extends Error {
    constructor(messageOrDescriptor, status) {
        if (Array.isArray(messageOrDescriptor)) {
            super(messageOrDescriptor[1]);
            this.code = messageOrDescriptor[0];
        }
        else {
            super(messageOrDescriptor);
        }
        this.status = status || util_1.HttpStatusCode.BadRequest;
        this.name = util_1.HttpCodeNames.get(this.status) || 'Unknown Error';
        Error.captureStackTrace(this, this.constructor);
    }
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message
        };
    }
}
exports.ClientError = ClientError;
// SERVER ERRORS
// ================================================================================================
class ServerError extends Error {
    constructor(message, causeOrStatus, status) {
        super(message);
        if (typeof causeOrStatus === 'number') {
            this.status = causeOrStatus;
        }
        else {
            this.status = status || util_1.HttpStatusCode.InternalServerError;
            this.cause = causeOrStatus;
        }
        this.name = util_1.HttpCodeNames.get(this.status) || 'Unknown Error';
        Error.captureStackTrace(this, this.constructor);
    }
    toJSON() {
        const cause = this.cause && this.cause instanceof ServerError
            ? this.cause : this.cause.message;
        return {
            name: this.name,
            message: this.message,
            cause: cause
        };
    }
}
exports.ServerError = ServerError;
// PUBLIC FUNCTIONS
// ================================================================================================
function appendMessage(error, message) {
    if (!error)
        return undefined;
    if (!message)
        return error;
    error.message = `${message}: ${error.message}`;
    return error;
}
exports.appendMessage = appendMessage;
//# sourceMappingURL=errors.js.map
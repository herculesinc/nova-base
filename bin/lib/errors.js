"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const util_1 = require("./util");
// BASE EXCEPTION CLASS
// ================================================================================================
class Exception extends Error {
    constructor(messageOrOptions, status) {
        if (typeof messageOrOptions === 'string') {
            super(messageOrOptions);
            this.status = (typeof status !== 'number' || status < 400 || status > 599)
                ? util_1.HttpStatusCode.InternalServerError : status;
            Error.captureStackTrace(this, this.constructor);
        }
        else {
            super(messageOrOptions.message);
            status = messageOrOptions.status;
            this.status = (typeof status !== 'number' || status < 400 || status > 599)
                ? util_1.HttpStatusCode.InternalServerError : status;
            this.code = messageOrOptions.code;
            this.cause = messageOrOptions.cause;
            if (this.cause) {
                this.message = this.message
                    ? `${this.message}: ${this.cause.message}`
                    : this.cause.message;
            }
            Error.captureStackTrace(this, messageOrOptions.stackStart || this.constructor);
        }
        this.name = util_1.HttpCodeNames.get(this.status) || 'Unknown Error';
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    get isClientError() {
        return (this.status >= 400 && this.status < 500);
    }
    get isServerError() {
        return (this.status >= 500 && this.status < 600);
    }
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message
        };
    }
}
exports.Exception = Exception;
// DERIVED ERROR CLASSESS
// ================================================================================================
class TooBusyError extends Exception {
    constructor(message) {
        super(message || 'The server is too busy', util_1.HttpStatusCode.ServiceUnavailable);
    }
}
exports.TooBusyError = TooBusyError;
class InvalidEndpointError extends Exception {
    constructor(path) {
        super(`Endpoint for ${path} does not exist`, util_1.HttpStatusCode.NotFound);
        this.name = 'Invalid Endpoint';
    }
}
exports.InvalidEndpointError = InvalidEndpointError;
class UnsupportedMethodError extends Exception {
    constructor(method, path) {
        super(`Method ${method} is not supported for ${path} endpoint`, util_1.HttpStatusCode.NotAllowed);
    }
}
exports.UnsupportedMethodError = UnsupportedMethodError;
// PUBLIC FUNCTIONS
// ================================================================================================
function wrapMessage(error, message) {
    if (!error)
        return undefined;
    if (!message)
        return error;
    error.message = `${message}: ${error.message}`;
    return error;
}
exports.wrapMessage = wrapMessage;
function isError(value) {
    if (!value)
        return false;
    return (value instanceof Error);
}
exports.isError = isError;
//# sourceMappingURL=errors.js.map
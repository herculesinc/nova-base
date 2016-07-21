"use strict";
// IMPORTS
// ================================================================================================
const util_1 = require('./util');
// EXCEPTION CLASS
// ================================================================================================
class Exception extends Error {
    constructor(messageOrOptions, status) {
        if (typeof messageOrOptions === 'string') {
            super(messageOrOptions);
            this.status = status || util_1.HttpStatusCode.InternalServerError;
            Error.captureStackTrace(this, this.constructor);
        }
        else {
            super(messageOrOptions.message);
            this.status = messageOrOptions.status || util_1.HttpStatusCode.InternalServerError;
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
//# sourceMappingURL=errors.js.map
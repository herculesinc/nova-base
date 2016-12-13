"use strict";
// IMPORTS
// ================================================================================================
const errors_1 = require("./errors");
const util_1 = require("./util");
// VALIDATORS
// ================================================================================================
exports.validate = function (value, message) {
    if (value) {
        if (value instanceof Error)
            throw new errors_1.Exception({
                message: message,
                status: util_1.HttpStatusCode.InternalServerError,
                cause: value,
                stackStart: exports.validate
            });
        return value;
    }
    else
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.InternalServerError,
            stackStart: exports.validate
        });
};
// REQUEST
// ------------------------------------------------------------------------------------------------
exports.validate.request = function (value, messageOrDescriptorOrCode, code) {
    if (value) {
        if (value instanceof Error) {
            let message;
            if (typeof messageOrDescriptorOrCode === 'string') {
                message = messageOrDescriptorOrCode;
            }
            else if (typeof messageOrDescriptorOrCode === 'number') {
                code = messageOrDescriptorOrCode;
            }
            else if (messageOrDescriptorOrCode) {
                code = messageOrDescriptorOrCode[0];
                message = messageOrDescriptorOrCode[1];
            }
            throw new errors_1.Exception({
                message: message,
                status: util_1.HttpStatusCode.BadRequest,
                code: code,
                cause: value,
                stackStart: exports.validate.request
            });
        }
        return value;
    }
    else {
        let message;
        if (typeof messageOrDescriptorOrCode === 'string') {
            message = messageOrDescriptorOrCode;
        }
        else if (typeof messageOrDescriptorOrCode === 'number') {
            code = messageOrDescriptorOrCode;
        }
        else if (messageOrDescriptorOrCode) {
            code = messageOrDescriptorOrCode[0];
            message = messageOrDescriptorOrCode[1];
        }
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.BadRequest,
            code: code,
            stackStart: exports.validate.request
        });
    }
};
// AUTOHRIZED
// ------------------------------------------------------------------------------------------------
exports.validate.authorized = function (value, message) {
    if (value) {
        if (value instanceof Error)
            throw new errors_1.Exception({
                message: message,
                status: util_1.HttpStatusCode.Unauthorized,
                cause: value,
                stackStart: exports.validate.authorized
            });
        return value;
    }
    else
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.Unauthorized,
            stackStart: exports.validate.authorized
        });
};
// INPUTS
// ------------------------------------------------------------------------------------------------
exports.validate.input = function (value, message) {
    if (value) {
        if (value instanceof Error)
            throw new errors_1.Exception({
                message: message,
                status: util_1.HttpStatusCode.InvalidInputs,
                cause: value,
                stackStart: exports.validate.input
            });
        return value;
    }
    else
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.InvalidInputs,
            stackStart: exports.validate.input
        });
};
// EXISTS
// ------------------------------------------------------------------------------------------------
exports.validate.exists = function (value, message) {
    if (value) {
        if (value instanceof Error)
            throw new errors_1.Exception({
                message: message,
                status: util_1.HttpStatusCode.NotFound,
                cause: value,
                stackStart: exports.validate.exists
            });
        return value;
    }
    else
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.NotFound,
            stackStart: exports.validate.exists
        });
};
//# sourceMappingURL=validator.js.map
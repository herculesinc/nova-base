"use strict";
// IMPORTS
// ================================================================================================
const errors_1 = require('./errors');
const util_1 = require('./util');
const util_2 = require('util');
// VALIDATORS
// ================================================================================================
exports.validate = function (condition, message) {
    if (!condition)
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.InternalServerError,
            stackStart: exports.validate
        });
};
exports.validate.from = function (error, message) {
    if (util_2.isError(error)) {
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.InternalServerError,
            cause: error,
            stackStart: exports.validate.from
        });
    }
};
// REQUEST
// ------------------------------------------------------------------------------------------------
exports.validate.request = function (condition, messageOrDescriptor) {
    if (!condition) {
        let message, code;
        if (typeof messageOrDescriptor === 'string') {
            message = messageOrDescriptor;
        }
        else {
            code = messageOrDescriptor[0];
            message = messageOrDescriptor[1];
        }
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.BadRequest,
            code: code,
            stackStart: exports.validate.request
        });
    }
};
exports.validate.request.from = function (error, messageOrDescriptor) {
    if (util_2.isError(error)) {
        let message, code;
        if (typeof messageOrDescriptor === 'string') {
            message = messageOrDescriptor;
        }
        else {
            code = messageOrDescriptor[0];
            message = messageOrDescriptor[1];
        }
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.BadRequest,
            code: code,
            cause: error,
            stackStart: exports.validate.request.from
        });
    }
};
// AUTOHRIZED
// ------------------------------------------------------------------------------------------------
exports.validate.authorized = function (condition, message) {
    if (!condition)
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.Unauthorized,
            stackStart: exports.validate.authorized
        });
};
exports.validate.authorized.from = function (error, message) {
    if (util_2.isError(error)) {
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.Unauthorized,
            cause: error,
            stackStart: exports.validate.authorized.from
        });
    }
};
// INPUTS
// ------------------------------------------------------------------------------------------------
exports.validate.inputs = function (condition, message) {
    if (!condition)
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.InvalidInputs,
            stackStart: exports.validate.inputs
        });
};
exports.validate.inputs.from = function (error, message) {
    if (util_2.isError(error)) {
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.InvalidInputs,
            cause: error,
            stackStart: exports.validate.inputs.from
        });
    }
};
// EXISTS
// ------------------------------------------------------------------------------------------------
exports.validate.exists = function (condition, message) {
    if (!condition)
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.NotFound,
            stackStart: exports.validate.exists
        });
};
exports.validate.exists.from = function (error, message) {
    if (util_2.isError(error)) {
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.NotFound,
            cause: error,
            stackStart: exports.validate.exists.from
        });
    }
};
//# sourceMappingURL=validator.js.map
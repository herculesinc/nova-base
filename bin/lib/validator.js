"use strict";
// IMPORTS
// ================================================================================================
const errors_1 = require('./errors');
const util_1 = require('./util');
const util_2 = require('util');
// VALIDATORS
// ================================================================================================
exports.validate = function (conditionOrError, message) {
    if (conditionOrError) {
        if (util_2.isError(conditionOrError))
            throw new errors_1.Exception({
                message: message,
                status: util_1.HttpStatusCode.InternalServerError,
                cause: conditionOrError,
                stackStart: exports.validate
            });
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
exports.validate.request = function (conditionOrError, messageOrDescriptor) {
    if (conditionOrError) {
        if (util_2.isError(conditionOrError)) {
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
                cause: conditionOrError,
                stackStart: exports.validate.request
            });
        }
    }
    else {
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
// AUTOHRIZED
// ------------------------------------------------------------------------------------------------
exports.validate.authorized = function (conditionOrError, message) {
    if (conditionOrError) {
        if (util_2.isError(conditionOrError))
            throw new errors_1.Exception({
                message: message,
                status: util_1.HttpStatusCode.Unauthorized,
                cause: conditionOrError,
                stackStart: exports.validate.authorized
            });
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
exports.validate.inputs = function (conditionOrError, message) {
    if (conditionOrError) {
        if (util_2.isError(conditionOrError))
            throw new errors_1.Exception({
                message: message,
                status: util_1.HttpStatusCode.InvalidInputs,
                cause: conditionOrError,
                stackStart: exports.validate.inputs
            });
    }
    else
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.InvalidInputs,
            stackStart: exports.validate.inputs
        });
};
// EXISTS
// ------------------------------------------------------------------------------------------------
exports.validate.exists = function (conditionOrError, message) {
    if (conditionOrError) {
        if (util_2.isError(conditionOrError))
            throw new errors_1.Exception({
                message: message,
                status: util_1.HttpStatusCode.NotFound,
                cause: conditionOrError,
                stackStart: exports.validate.exists
            });
    }
    else
        throw new errors_1.Exception({
            message: message,
            status: util_1.HttpStatusCode.NotFound,
            stackStart: exports.validate.exists
        });
};
//# sourceMappingURL=validator.js.map
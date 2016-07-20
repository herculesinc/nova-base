"use strict";
// IMPORTS
// ================================================================================================
const Errors_1 = require('./Errors');
const util_1 = require('./util');
const util_2 = require('util');
// VALIDATORS
// ================================================================================================
exports.validate = function (condition, message) {
    if (!condition)
        throw new Errors_1.ServerError(message);
};
exports.validate.from = function (error) {
    if (util_2.isError(error)) {
        throw (error instanceof Errors_1.ServerError) ? error : new Errors_1.ServerError(error.message, error);
    }
};
// REQUEST
// ------------------------------------------------------------------------------------------------
exports.validate.request = function (condition, message) {
    if (!condition)
        throw new Errors_1.ClientError(message, util_1.HttpStatusCode.BadRequest);
};
exports.validate.request.from = function (error) {
    if (util_2.isError(error))
        throw new Errors_1.ClientError(error.message, util_1.HttpStatusCode.BadRequest);
};
// AUTOHRIZED
// ------------------------------------------------------------------------------------------------
exports.validate.authorized = function (condition, message) {
    if (!condition)
        throw new Errors_1.ClientError(message, util_1.HttpStatusCode.Unauthorized);
};
exports.validate.authorized.from = function (error) {
    if (util_2.isError(error))
        throw new Errors_1.ClientError(error.message, util_1.HttpStatusCode.Unauthorized);
};
// INPUTS
// ------------------------------------------------------------------------------------------------
exports.validate.inputs = function (condition, message) {
    if (!condition)
        throw new Errors_1.ClientError(message, util_1.HttpStatusCode.InvalidInputs);
};
exports.validate.inputs.from = function (error) {
    if (util_2.isError(error))
        throw new Errors_1.ClientError(error.message, util_1.HttpStatusCode.InvalidInputs);
};
// EXISTS
// ------------------------------------------------------------------------------------------------
exports.validate.exists = function (condition, message) {
    if (!condition)
        throw new Errors_1.ClientError(message, util_1.HttpStatusCode.NotFound);
};
exports.validate.exists.from = function (error) {
    if (util_2.isError(error))
        throw new Errors_1.ClientError(error.message, util_1.HttpStatusCode.NotFound);
};
// CONTENT
// ------------------------------------------------------------------------------------------------
exports.validate.content = function (condition, message) {
    if (!condition)
        throw new Errors_1.ClientError(message, util_1.HttpStatusCode.UnsupportedContent);
};
exports.validate.content.from = function (error) {
    if (util_2.isError(error))
        throw new Errors_1.ClientError(error.message, util_1.HttpStatusCode.UnsupportedContent);
};
// ACCEPTS
// ------------------------------------------------------------------------------------------------
exports.validate.accepts = function (condition, message) {
    if (!condition)
        throw new Errors_1.ClientError(message, util_1.HttpStatusCode.NotAcceptable);
};
exports.validate.accepts.from = function (error) {
    if (util_2.isError(error))
        throw new Errors_1.ClientError(error.message, util_1.HttpStatusCode.NotAcceptable);
};
// ALLOWED
// ------------------------------------------------------------------------------------------------
exports.validate.allowed = function (condition, message) {
    if (!condition)
        throw new Errors_1.ClientError(message, util_1.HttpStatusCode.NotAllowed);
};
exports.validate.allowed.from = function (error) {
    if (util_2.isError(error))
        throw new Errors_1.ClientError(error.message, util_1.HttpStatusCode.NotAllowed);
};
// READY
// ------------------------------------------------------------------------------------------------
exports.validate.ready = function (condition, message) {
    if (!condition)
        throw new Errors_1.ClientError(message, util_1.HttpStatusCode.NotReady);
};
exports.validate.ready.from = function (error) {
    if (util_2.isError(error))
        throw new Errors_1.ClientError(error.message, util_1.HttpStatusCode.NotReady);
};
//# sourceMappingURL=validator.js.map
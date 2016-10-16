"use strict";
const utilities = require('./lib/util');
const errors_1 = require('./lib/errors');
// MODULE VARIABLES
// =================================================================================================
exports.util = {
    since: utilities.since,
    wrap: errors_1.wrapMessage,
    isError: errors_1.isError,
    arrays: {
        clean: utilities.cleanArray,
        areEqual: utilities.areArraysEqual
    },
    parse: {
        int: utilities.parseInteger,
        number: utilities.parseNumber,
        date: utilities.parseDate,
        boolean: utilities.parseBoolean,
        string: utilities.parseString
    }
};
// RE-EXPORTS
// =================================================================================================
var Executor_1 = require('./lib/Executor');
exports.Executor = Executor_1.Executor;
var validator_1 = require('./lib/validator');
exports.validate = validator_1.validate;
var errors_2 = require('./lib/errors');
exports.Exception = errors_2.Exception;
exports.TooBusyError = errors_2.TooBusyError;
exports.InvalidEndpointError = errors_2.InvalidEndpointError;
exports.UnsupportedMethodError = errors_2.UnsupportedMethodError;
//# sourceMappingURL=index.js.map
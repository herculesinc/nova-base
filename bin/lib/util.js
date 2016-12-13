"use strict";
// IMPORTS
// ================================================================================================
const validator = require("validator");
// TIMER
// ================================================================================================
function since(start) {
    const diff = process.hrtime(start);
    return (diff[0] * 1000 + Math.floor(diff[1] / 1000000));
}
exports.since = since;
// ARRAYS
// ================================================================================================
function cleanArray(source) {
    if (!source)
        return undefined;
    const target = [];
    for (let value of source) {
        if (value !== undefined && value !== null) {
            target.push(value);
        }
    }
    return target;
}
exports.cleanArray = cleanArray;
function areArraysEqual(a1, a2, strict = true, comparator) {
    if (a1 == a2)
        return true;
    if (!a1 || !a2)
        return false;
    if (a1.length !== a2.length)
        return false;
    if (strict) {
        if (comparator) {
            // simple array comparision, using custom comparator
            for (let i = 0; i < a1.length; i++) {
                if (!comparator(a1[i], a2[i]))
                    return false;
            }
        }
        else {
            // simple array comparision, using strict equality
            for (let i = 0; i < a1.length; i++) {
                if (a1[i] !== a2[i])
                    return false;
            }
        }
    }
    else {
        if (comparator) {
            // set-based comparision, using custom comparator
            for (let v1 of a1) {
                let found = false;
                for (let v2 of a2) {
                    if (comparator(v1, v2)) {
                        found = true;
                        break;
                    }
                }
                if (!found)
                    return false;
            }
        }
        else {
            // set-based comparison, using strict equality
            for (let v1 of a1) {
                let found = false;
                for (let v2 of a2) {
                    if (v1 === v2) {
                        found = true;
                        break;
                    }
                }
                if (!found)
                    return false;
            }
        }
    }
    return true;
}
exports.areArraysEqual = areArraysEqual;
// PARSERS
// ================================================================================================
function parseInteger(value, min, max) {
    var num;
    // parse the value
    if (typeof value === 'string') {
        if (!validator.isInt(value)) {
            return new TypeError(`'${value}' is not a valid integer`);
        }
        num = Number.parseInt(value, 10);
    }
    else if (typeof value === 'number') {
        if (!Number.isInteger(value)) {
            return new TypeError(`'${value}' is not a valid integer`);
        }
        num = value;
    }
    else {
        return new TypeError(`'${value}' is not a valid integer`);
    }
    // validate min boundary
    if (min !== null && min !== undefined && num < min) {
        return new TypeError(`value cannot be smaller than ${min}`);
    }
    // validate max boundary
    if (max !== null && max !== undefined && num > max) {
        return new TypeError(`value cannot be greater than ${max}`);
    }
    return num;
}
exports.parseInteger = parseInteger;
function parseNumber(value, min, max) {
    var num;
    // parse the value
    if (typeof value === 'string') {
        if (!validator.isFloat(value)) {
            return new TypeError(`'${value}' is not a valid number`);
        }
        num = Number.parseFloat(value);
    }
    else if (typeof value === 'number') {
        num = value;
    }
    else {
        return new TypeError(`'${value}' is not a valid number`);
    }
    // validate min boundary
    if (min !== null && min !== undefined && num < min) {
        return new TypeError(`value cannot be smaller than ${min}`);
    }
    // validate max boundary
    if (max !== null && max !== undefined && num > max) {
        return new TypeError(`value cannot be greater than ${max}`);
    }
    return num;
}
exports.parseNumber = parseNumber;
function parseBoolean(value, strict = true) {
    if (strict) {
        if (typeof value === 'string') {
            value = value.trim().toLowerCase();
            if (value === 'true')
                return true;
            if (value === 'false')
                return false;
            return new TypeError(`'${value}' is not a valid boolean`);
        }
        else if (typeof value === 'boolean') {
            return value;
        }
        else {
            return new TypeError(`'${value}' is not a valid boolean`);
        }
    }
    else {
        return (!!value);
    }
}
exports.parseBoolean = parseBoolean;
function parseDate(value, paramName) {
    var date;
    if (typeof value === 'string') {
        if (validator.isNumeric(value)) {
            date = new Date(Number.parseInt(value, 10));
        }
        else {
            date = new Date(value);
        }
    }
    else if (typeof value === 'number') {
        date = new Date(value);
    }
    else {
        if (value && value instanceof Date) {
            date = value;
        }
        else {
            date = new Date(value);
        }
    }
    if (Number.isNaN(date.valueOf())) {
        return new TypeError(`'${value}' is not a valid date`);
    }
    return date;
}
exports.parseDate = parseDate;
function parseString(value, minLength, maxLength) {
    if (value === null || value === undefined) {
        return minLength ? new TypeError(`value is missing`) : undefined;
    }
    else if (value === '') {
        return minLength
            ? new TypeError(`value must be at least ${minLength} characters long`)
            : undefined;
    }
    if (typeof value === 'string') {
        value = value.trim();
        if (minLength && value.length < minLength) {
            return new TypeError(`value must be at least ${minLength} characters long`);
        }
        if (maxLength && value.length > maxLength) {
            return new TypeError(`value can be at most ${maxLength} characters long`);
        }
        return value || undefined;
    }
    else {
        return new TypeError(`value '${value}' is not a string`);
    }
}
exports.parseString = parseString;
// HTTP CODES
// ================================================================================================
var HttpStatusCode;
(function (HttpStatusCode) {
    HttpStatusCode[HttpStatusCode["OK"] = 200] = "OK";
    HttpStatusCode[HttpStatusCode["Created"] = 201] = "Created";
    HttpStatusCode[HttpStatusCode["Accepted"] = 202] = "Accepted";
    HttpStatusCode[HttpStatusCode["NoContent"] = 204] = "NoContent";
    HttpStatusCode[HttpStatusCode["BadRequest"] = 400] = "BadRequest";
    HttpStatusCode[HttpStatusCode["Unauthorized"] = 401] = "Unauthorized";
    HttpStatusCode[HttpStatusCode["InvalidInputs"] = 402] = "InvalidInputs";
    HttpStatusCode[HttpStatusCode["Forbidden"] = 403] = "Forbidden";
    HttpStatusCode[HttpStatusCode["NotFound"] = 404] = "NotFound";
    HttpStatusCode[HttpStatusCode["NotAllowed"] = 405] = "NotAllowed";
    HttpStatusCode[HttpStatusCode["NotAcceptable"] = 406] = "NotAcceptable";
    HttpStatusCode[HttpStatusCode["PayloadTooLarge"] = 413] = "PayloadTooLarge";
    HttpStatusCode[HttpStatusCode["UnsupportedContent"] = 415] = "UnsupportedContent";
    HttpStatusCode[HttpStatusCode["NotReady"] = 425] = "NotReady";
    HttpStatusCode[HttpStatusCode["TooManyRequests"] = 429] = "TooManyRequests";
    HttpStatusCode[HttpStatusCode["InternalServerError"] = 500] = "InternalServerError";
    HttpStatusCode[HttpStatusCode["NotImplemented"] = 501] = "NotImplemented";
    HttpStatusCode[HttpStatusCode["ServiceUnavailable"] = 503] = "ServiceUnavailable";
})(HttpStatusCode = exports.HttpStatusCode || (exports.HttpStatusCode = {}));
exports.HttpCodeNames = new Map([
    [200, 'OK'],
    [201, 'Created'],
    [202, 'Accepted'],
    [204, 'No Content'],
    [400, 'Bad Request'],
    [401, 'Unauthorized'],
    [402, 'Invalid Inputs'],
    [403, 'Forbidden'],
    [404, 'Not Found'],
    [405, 'Method Not Allowed'],
    [406, 'Not Acceptable'],
    [413, 'Payload Too Large'],
    [415, 'Unsupported Media Type'],
    [425, 'Not Ready'],
    [429, 'Too Many Requests'],
    [500, 'Internal Server Error'],
    [501, 'Not Implemented'],
    [503, 'Service Unavailable'],
]);
// DUMMY FUNCTIONS
// ================================================================================================
function noop() { }
exports.noop = noop;
;
//# sourceMappingURL=util.js.map
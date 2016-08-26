// IMPORTS
// ================================================================================================
import { Exception } from './errors';
import { HttpStatusCode } from './util';
import { isError } from 'util';

// INTERFACES
// ================================================================================================
export interface BaseValidator {
    (condition: any, message: string): void;
    from?: (error: Error, mesage?: string) => void;
}

export interface DescriptorValidator {
    (condition: any, message: string): void;
    (condition: any, descriptor: [number, string]): void;

    from?: (error: Error, messageOrDescriptor?: string | [number, string]) => void;
}

export interface Validator extends BaseValidator {
    request?    : DescriptorValidator;
    authorized? : BaseValidator;
    inputs?     : BaseValidator;
    exists?     : BaseValidator;
}

// VALIDATORS
// ================================================================================================
export const validate: Validator = function(condition: any, message: string) {
    if (!condition) throw new Exception({
        message     : message,
        status      : HttpStatusCode.InternalServerError,
        stackStart  : validate
    });
} 

validate.from = function(error: Error, message?: string) {
    if (isError(error)) {
        throw new Exception({
            message     : message,
            status      : HttpStatusCode.InternalServerError,
            cause       : error,
            stackStart  : validate.from
        });
    }
}

// REQUEST
// ------------------------------------------------------------------------------------------------
validate.request = function(condition: any, messageOrDescriptor: string | [number, string]) {
    if (!condition) {
        let message: string, code: number;
        if (typeof messageOrDescriptor === 'string') {
            message = messageOrDescriptor;
        }
        else {
            code = messageOrDescriptor[0];
            message = messageOrDescriptor[1];
        }

        throw new Exception({
            message     : message,
            status      : HttpStatusCode.BadRequest,
            code        : code,
            stackStart  : validate.request
        });
    }
}

validate.request.from = function(error: Error, messageOrDescriptor: string | [number, string]) {
    if (isError(error)) {
        let message: string, code: number;
        if (typeof messageOrDescriptor === 'string') {
            message = messageOrDescriptor;
        }
        else {
            code = messageOrDescriptor[0];
            message = messageOrDescriptor[1];
        }

        throw new Exception({
            message     : message,
            status      : HttpStatusCode.BadRequest,
            code        : code,
            cause       : error,
            stackStart  : validate.request.from
        });
    }
}

// AUTOHRIZED
// ------------------------------------------------------------------------------------------------
validate.authorized = function(condition: any, message: string) {
    if (!condition) throw new Exception({
        message     : message,
        status      : HttpStatusCode.Unauthorized,
        stackStart  : validate.authorized
    });
}

validate.authorized.from = function(error: Error, message?: string) {
    if (isError(error)) {
        throw new Exception({
            message     : message,
            status      : HttpStatusCode.Unauthorized,
            cause       : error,
            stackStart  : validate.authorized.from
        });
    }
}

// INPUTS
// ------------------------------------------------------------------------------------------------
validate.inputs = function(condition: any, message: string) {
    if (!condition) throw new Exception({
        message     : message,
        status      : HttpStatusCode.InvalidInputs,
        stackStart  : validate.inputs
    });
}

validate.inputs.from = function(error: Error, message?: string) {
    if (isError(error)) {
        throw new Exception({
            message     : message,
            status      : HttpStatusCode.InvalidInputs,
            cause       : error,
            stackStart  : validate.inputs.from
        });
    }
}

// EXISTS
// ------------------------------------------------------------------------------------------------
validate.exists = function(condition: any, message: string) {
    if (!condition) throw new Exception({
        message     : message,
        status      : HttpStatusCode.NotFound,
        stackStart  : validate.exists
    });
}

validate.exists.from = function(error: Error, message?: string) {
    if (isError(error)) {
        throw new Exception({
            message     : message,
            status      : HttpStatusCode.NotFound,
            cause       : error,
            stackStart  : validate.exists.from
        });
    }
}
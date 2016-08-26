// IMPORTS
// ================================================================================================
import { Exception } from './errors';
import { HttpStatusCode } from './util';
import { isError } from 'util';

// INTERFACES
// ================================================================================================
export interface BaseValidator {
    (conditionOrError: Error | any, message: string): void;
}

export interface DescriptorValidator {
    (conditionOrError: Error | any, message: string): void;
    (conditionOrError: Error | any, descriptor: [number, string]): void;
}

export interface Validator extends BaseValidator {
    request?    : DescriptorValidator;
    authorized? : BaseValidator;
    inputs?     : BaseValidator;
    exists?     : BaseValidator;
}

// VALIDATORS
// ================================================================================================
export const validate: Validator = function(conditionOrError: Error | any, message: string) {
    if (conditionOrError) {
        if (isError(conditionOrError)) throw new Exception({
            message     : message,
            status      : HttpStatusCode.InternalServerError,
            cause       : conditionOrError,
            stackStart  : validate
        });
    }
    else throw new Exception({
        message     : message,
        status      : HttpStatusCode.InternalServerError,
        stackStart  : validate
    });
} 

// REQUEST
// ------------------------------------------------------------------------------------------------
validate.request = function(conditionOrError: Error | any, messageOrDescriptor: string | [number, string]) {
    if (conditionOrError) {
        if (isError(conditionOrError)) {
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
                cause       : conditionOrError,
                stackStart  : validate.request
            });
        }
    } 
    else {
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

// AUTOHRIZED
// ------------------------------------------------------------------------------------------------
validate.authorized = function(conditionOrError: Error | any, message: string) {
    if (conditionOrError) {
        if (isError(conditionOrError)) throw new Exception({
            message     : message,
            status      : HttpStatusCode.Unauthorized,
            cause       : conditionOrError,
            stackStart  : validate.authorized
        });
    }
    else throw new Exception({
        message     : message,
        status      : HttpStatusCode.Unauthorized,
        stackStart  : validate.authorized
    });
}

// INPUTS
// ------------------------------------------------------------------------------------------------
validate.inputs = function(conditionOrError: Error | any, message: string) {
    if (conditionOrError) {
        if (isError(conditionOrError)) throw new Exception({
            message     : message,
            status      : HttpStatusCode.InvalidInputs,
            cause       : conditionOrError,
            stackStart  : validate.inputs
        });
    }
    else throw new Exception({
        message     : message,
        status      : HttpStatusCode.InvalidInputs,
        stackStart  : validate.inputs
    });
}

// EXISTS
// ------------------------------------------------------------------------------------------------
validate.exists = function(conditionOrError: Error | any, message: string) {
    if (conditionOrError) {
        if (isError(conditionOrError)) throw new Exception({
            message     : message,
            status      : HttpStatusCode.NotFound,
            cause       : conditionOrError,
            stackStart  : validate.exists
        });
    }
    else throw new Exception({
        message     : message,
        status      : HttpStatusCode.NotFound,
        stackStart  : validate.exists
    });
}
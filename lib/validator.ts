// IMPORTS
// ================================================================================================
import { Exception, ErrorDescriptor } from './errors';
import { HttpStatusCode } from './util';

// INTERFACES
// ================================================================================================
export interface BaseValidator {
    (value: any, message?: string): any;
}

export interface DescriptorValidator {
    (value: any, code?: number): any;
    (value: any, message?: string, code?: number): any;
    (value: any, descriptor: ErrorDescriptor): any;
}

export interface Validator extends BaseValidator {
    request?    : DescriptorValidator;
    input?      : BaseValidator;
    authorized? : BaseValidator;
    exists?     : BaseValidator;
}

// VALIDATORS
// ================================================================================================
export const validate: Validator = function(value: any, message?: string): any {
    if (value) {
        if (value instanceof Error) throw new Exception({
            message     : message,
            status      : HttpStatusCode.InternalServerError,
            cause       : value,
            stackStart  : validate
        });

        return value;
    }
    else throw new Exception({
        message     : message,
        status      : HttpStatusCode.InternalServerError,
        stackStart  : validate
    });
} 

// REQUEST
// ------------------------------------------------------------------------------------------------
validate.request = function(value: any, messageOrDescriptorOrCode?: string | number | [number, string], code?: number): any {
    if (value) {
        if (value instanceof Error) {
            let message: string;
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
            
            throw new Exception({
                message     : message,
                status      : HttpStatusCode.BadRequest,
                code        : code,
                cause       : value,
                stackStart  : validate.request
            });
        }

        return value;
    } 
    else {
        let message: string;
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
validate.authorized = function(value: any, message?: string): any {
    if (value) {
        if (value instanceof Error) throw new Exception({
            message     : message,
            status      : HttpStatusCode.Unauthorized,
            cause       : value,
            stackStart  : validate.authorized
        });

        return value;
    }
    else throw new Exception({
        message     : message,
        status      : HttpStatusCode.Unauthorized,
        stackStart  : validate.authorized
    });
}

// INPUTS
// ------------------------------------------------------------------------------------------------
validate.input = function(value: any, message?: string): any {
    if (value) {
        if (value instanceof Error) throw new Exception({
            message     : message,
            status      : HttpStatusCode.InvalidInputs,
            cause       : value,
            stackStart  : validate.input
        });

        return value;
    }
    else throw new Exception({
        message     : message,
        status      : HttpStatusCode.InvalidInputs,
        stackStart  : validate.input
    });
}

// EXISTS
// ------------------------------------------------------------------------------------------------
validate.exists = function(value: any, message?: string): any {
    if (value) {
        if (value instanceof Error) throw new Exception({
            message     : message,
            status      : HttpStatusCode.NotFound,
            cause       : value,
            stackStart  : validate.exists
        });

        return value;
    }
    else throw new Exception({
        message     : message,
        status      : HttpStatusCode.NotFound,
        stackStart  : validate.exists
    });
}
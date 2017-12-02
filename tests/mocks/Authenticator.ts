// IMPORTS
// =================================================================================================
import { AuthInputs, Authenticator, AuthRequestor } from './../../index';
import { ActionContext } from './../../lib/Action';
import { validate } from './../../lib/validator';

// MODULE VARIABLES
// =================================================================================================
const PASSWORD_MAP = {
    user1: 'password1',
    user2: 'password2'
};

// INTERFACES
// =================================================================================================
export interface Token {
    username: string;
    password: string;
}

// AUTHENTICATOR
// =================================================================================================
export const authenticator: Authenticator<Token, Token> = {

    decode(inputs: AuthInputs): Token {
        validate.authorized(inputs.scheme === 'token', 'Authentication schema not supported');
        const parts = inputs.credentials.split('%');
        validate.authorized(parts.length === 2, 'Invalid token');
        return {
            username: parts[0],
            password: parts[1]
        }
    },

    authenticate(this: ActionContext, requestor: AuthRequestor<Token>, options: any): Promise<Token> {
        const token = requestor.auth;
        try {
            validate.authorized(token, 'Token is undefined');
            validate.authorized(token.username, 'Invalid user');
            validate.authorized(token.password === PASSWORD_MAP[token.username], 'Invalid password');
            this.logger.debug(`Authenticated ${token.username}`);
            return Promise.resolve(token);
        }
        catch (e) {
            return Promise.reject(e);
        }
    },

    toOwner(token: Token): string {
        return token.username;
    }
}
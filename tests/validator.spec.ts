// IMPORTS
// =================================================================================================
import { expect } from 'chai';
import { validate } from './../lib/Validator';
import * as errors from './../lib/errors';

// SETUP
// =================================================================================================
function dateComparator(d1: Date, d2: Date): boolean {
    if (d1 == d2) return true;
    if (!d1 || !d2) return false;
    return d1.valueOf() === d2.valueOf();
}

// TESTS
// =================================================================================================
describe('NOVA-BASE -> Validator tests;', () => {

    describe('base validator should work correctly;', () => {
        it('validator should throw an error on falsy value', done => {
            try {
                validate(false, 'test message');
            }
            catch (error) {
                expect(error).to.be.instanceof(errors.Exception);
                expect(error.status).to.equal(500);
                expect(error.message).to.equal('test message');
            }
            
            done();
        });

        it('validator should throw an error on error value', done => {
            try {
                validate(new TypeError('inner message'), 'test message');
            }
            catch (error) {
                expect(error).to.be.instanceof(errors.Exception);
                expect(error.status).to.equal(500);
                expect(error.message).to.equal('test message: inner message');
            }
            
            done();
        });

        it('validator should return a value on truthy value', done => {
            const value = validate(123, 'test message');
            expect(value).to.equal(123);
            done();
        });
    });

   describe('request validator should work correctly;', () => {
        it('validator should throw an error on falsy value', done => {
            try {
                validate.request(false, 'test message', 100);
            }
            catch (error) {
                expect(error).to.be.instanceof(errors.Exception);
                expect(error.status).to.equal(400);
                expect(error.code).to.equal(100);
                expect(error.message).to.equal('test message');
            }
            
            done();
        });

        it('validator should throw an error on error value', done => {
            try {
                validate.request(new TypeError('inner message'), 'test message', 100);
            }
            catch (error) {
                expect(error).to.be.instanceof(errors.Exception);
                expect(error.status).to.equal(400);
                expect(error.code).to.equal(100);
                expect(error.message).to.equal('test message: inner message');
            }
            
            done();
        });

        it('validator should copy error message from inner error', done => {
            try {
                validate.request(new TypeError('inner message'));
            }
            catch (error) {
                expect(error).to.be.instanceof(errors.Exception);
                expect(error.status).to.equal(400);
                expect(error.code).to.be.undefined;
                expect(error.message).to.equal('inner message');
            }
            
            done();
        });

        it('validator should apply error code when provided', done => {
            try {
                validate.request(new TypeError('inner message'), 100);
            }
            catch (error) {
                expect(error).to.be.instanceof(errors.Exception);
                expect(error.status).to.equal(400);
                expect(error.code).to.equal(100);
                expect(error.message).to.equal('inner message');
            }
            
            done();
        });

        it('validator should copy error message from inner error', done => {
            try {
                validate.request(new TypeError('inner message'));
            }
            catch (error) {
                expect(error).to.be.instanceof(errors.Exception);
                expect(error.status).to.equal(400);
                expect(error.message).to.equal('inner message');
            }
            
            done();
        });

        it('validator should take info from descriptor when provided', done => {
            try {
                validate.request(false, [100, 'test message']);
            }
            catch (error) {
                expect(error).to.be.instanceof(errors.Exception);
                expect(error.status).to.equal(400);
                expect(error.code).to.equal(100);
                expect(error.message).to.equal('test message');
            }
            
            done();
        });

        it('validator should return a value on truthy value', done => {
            const value = validate.request(123, 'test message');
            expect(value).to.equal(123);
            done();
        });
    });

    describe('input validator should work correctly;', () => {
        it('validator should throw an error on falsy value', done => {
            try {
                validate.input(false, 'test message');
            }
            catch (error) {
                expect(error).to.be.instanceof(errors.Exception);
                expect(error.status).to.equal(402);
                expect(error.message).to.equal('test message');
            }
            
            done();
        });

        it('validator should throw an error on error value', done => {
            try {
                validate.input(new TypeError('inner message'), 'test message');
            }
            catch (error) {
                expect(error).to.be.instanceof(errors.Exception);
                expect(error.status).to.equal(402);
                expect(error.message).to.equal('test message: inner message');
            }
            
            done();
        });

        it('validator should copy error message from inner error', done => {
            try {
                validate.input(new TypeError('inner message'));
            }
            catch (error) {
                expect(error).to.be.instanceof(errors.Exception);
                expect(error.status).to.equal(402);
                expect(error.message).to.equal('inner message');
            }
            
            done();
        });

        it('validator should return a value on truthy value', done => {
            const value = validate.input(123, 'test message');
            expect(value).to.equal(123);
            done();
        });
    });
});

// HELPERS
// =================================================================================================
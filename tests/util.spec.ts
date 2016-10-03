// IMPORTS
// =================================================================================================
import { expect } from 'chai';
import * as util from './../lib/util';

// SETUP
// =================================================================================================
function dateComparator(d1: Date, d2: Date): boolean {
    if (d1 == d2) return true;
    if (!d1 || !d2) return false;
    return d1.valueOf() === d2.valueOf();
}

// TESTS
// =================================================================================================
describe('NOVA-BASE -> Utilities tests;', () => {

    describe('array comparison should work correctly;', () => {
        it('equal arrays of strings should be compared correctly', done => {
            const a1 = ['a', 'b', 'c'];
            const a2 = ['a', 'b', 'c'];

            expect(util.areArraysEqual(a1, a1)).to.be.true;
            expect(util.areArraysEqual(a1, a2)).to.be.true;
            done();
        });

        it('equal arrays of numbers should be compared correctly', done => {
            const a1 = [1, 2, 3];
            const a2 = [1, 2, 3];

            expect(util.areArraysEqual(a1, a1)).to.be.true;
            expect(util.areArraysEqual(a1, a2)).to.be.true;
            done();
        });

        it('equal arrays of dates should be compared correctly', done => {
            const timestamp = Date.now();
            const a1 = [new Date(timestamp), new Date(timestamp + 1), new Date(timestamp + 2)];
            const a2 = [new Date(timestamp), new Date(timestamp + 1), new Date(timestamp + 2)];

            expect(util.areArraysEqual(a1, a1)).to.be.true;
            expect(util.areArraysEqual(a1, a2)).to.be.false;
            expect(util.areArraysEqual(a1, a1, true, dateComparator)).to.be.true;
            expect(util.areArraysEqual(a1, a2, true, dateComparator)).to.be.true;
            done();
        });

        it('arrays of differnt lengths should be compared correctly', done => {
            const a1 = [1, 2, 3];
            const a2 = [1, 2, 3, 4];

            expect(util.areArraysEqual(a1, a2)).to.be.false;
            done();
        });

        it('unequal arrays of same length should be compared correctly', done => {
            const a1 = [1, 2, 3];
            const a2 = [3, 2, 1];

            expect(util.areArraysEqual(a1, a2)).to.be.false;
            done();
        });

        it('unequal arrays of dates should be compared correctly', done => {
            const timestamp = Date.now();
            const a1 = [new Date(timestamp), new Date(timestamp + 1), new Date(timestamp + 2)];
            const a2 = [new Date(timestamp), new Date(timestamp + 2), new Date(timestamp + 2)];

            expect(util.areArraysEqual(a1, a2)).to.be.false;
            expect(util.areArraysEqual(a1, a2, true, dateComparator)).to.be.false;
            done();
        });
    });

    describe('set comparison should work correctly;', () => {
        it('equal sets of strings should be compared correctly', done => {
            const a1 = ['a', 'b', 'c'];
            const a2 = ['b', 'c', 'a'];

            expect(util.areArraysEqual(a1, a1, false)).to.be.true;
            expect(util.areArraysEqual(a1, a2, false)).to.be.true;
            done();
        });

        it('equal sets of numbers should be compared correctly', done => {
            const a1 = [1, 2, 3];
            const a2 = [3, 2, 1];

            expect(util.areArraysEqual(a1, a1, false)).to.be.true;
            expect(util.areArraysEqual(a1, a2, false)).to.be.true;
            done();
        });

        it('equal sets of dates should be compared correctly', done => {
            const timestamp = Date.now();
            const a1 = [new Date(timestamp), new Date(timestamp + 1), new Date(timestamp + 2)];
            const a2 = [new Date(timestamp + 1), new Date(timestamp), new Date(timestamp + 2)];

            expect(util.areArraysEqual(a1, a1)).to.be.true;
            expect(util.areArraysEqual(a1, a2)).to.be.false;
            expect(util.areArraysEqual(a1, a1, true, dateComparator)).to.be.true;
            expect(util.areArraysEqual(a1, a2, true, dateComparator)).to.be.false;
            done();
        });

        it('sets of differnt lengths should be compared correctly', done => {
            const a1 = [1, 2, 3];
            const a2 = [1, 2, 3, 4];

            expect(util.areArraysEqual(a1, a2, false)).to.be.false;
            done();
        });

        it('unequal sets of same length should be compared correctly', done => {
            const a1 = [1, 2, 3];
            const a2 = [3, 4, 1];

            expect(util.areArraysEqual(a1, a2, false)).to.be.false;
            done();
        });

        it('unequal sets of dates should be compared correctly', done => {
            const timestamp = Date.now();
            const a1 = [new Date(timestamp), new Date(timestamp + 1), new Date(timestamp + 2)];
            const a2 = [new Date(timestamp), new Date(timestamp + 3), new Date(timestamp + 2)];

            expect(util.areArraysEqual(a1, a2)).to.be.false;
            expect(util.areArraysEqual(a1, a2, true, dateComparator)).to.be.false;
            done();
        });
    });

    describe('Integer parsing should work correctly;', () => {
        it('parsing a valid string should work correctly', done => {
            expect(util.parseInteger('123')).to.equal(123);
            done();
        });

        it('parsing a number should work correctly', done => {
            expect(util.parseInteger(123)).to.equal(123);
            done();
        });

        it('parsing an invalid string should return an error', done => {
            expect(util.parseInteger('123.4')).to.be.instanceof(TypeError);
            expect(util.parseInteger('12ab')).to.be.instanceof(TypeError);
            expect(util.parseInteger('abc')).to.be.instanceof(TypeError);
            done();
        });

        it('parsing an invalid number should return an error', done => {
            expect(util.parseInteger(123.4)).to.be.instanceof(TypeError);
            done();
        });

        it('max/min constraints should be enforced when provided', done => {
            expect(util.parseInteger('123', 125)).to.be.instanceof(TypeError);
            expect(util.parseInteger('123', undefined, 120)).to.be.instanceof(TypeError);
            expect(util.parseInteger('123', 120, 125)).to.equal(123);
            done();
        });
    });

    describe('Number parsing should work correctly;', () => {
        it('parsing a valid string should work correctly', done => {
            expect(util.parseNumber('123.45')).to.equal(123.45);
            done();
        });

        it('parsing a number should work correctly', done => {
            expect(util.parseNumber(123.45)).to.equal(123.45);
            done();
        });

        it('parsing an invalid string should return an error', done => {
            expect(util.parseNumber('12ab')).to.be.instanceof(TypeError);
            expect(util.parseNumber('abc')).to.be.instanceof(TypeError);
            done();
        });

        it('max/min constraints should be enforced when provided', done => {
            expect(util.parseNumber('123.45', 125)).to.be.instanceof(TypeError);
            expect(util.parseNumber('123.45', undefined, 120)).to.be.instanceof(TypeError);
            expect(util.parseNumber('123.45', 120, 125)).to.equal(123.45);
            done();
        });
    });

    describe('Date parsing should work correctly;', () => {
        it('parsing a valid timestamp should work correctly', done => {
            const timestamp = Date.now();
            expect(util.parseDate(timestamp).valueOf()).to.equal(timestamp);
            done();
        });

        it('parsing a valid timestamp string should work correctly', done => {
            const timestamp = Date.now();
            const str = timestamp + '';
            expect(util.parseDate(str).valueOf()).to.equal(timestamp);
            done();
        });

        it('parsing a simple date should work correctly ', done => {
            const date = '2016-10-03';
            // months parameter is 0-based
            expect(util.parseDate(date).valueOf()).to.equal(Date.UTC(2016, 9, 3).valueOf());
            done();
        });

        it('parsing an invlid string should return an error', done => {
            expect(util.parseDate('abc')).to.be.instanceof(TypeError);
            expect(util.parseDate('2016-13-03')).to.be.instanceof(TypeError);
            expect(util.parseDate('2016-10-33')).to.be.instanceof(TypeError);
            done();
        });
    });

    describe('Boolean parsing should work correctly;', () => {
        it('parsing a valid boolean string should work correctly', done => {
            expect(util.parseBoolean('true')).to.be.true;
            expect(util.parseBoolean('TRUE')).to.be.true;
            expect(util.parseBoolean('false')).to.be.false;
            expect(util.parseBoolean('FALSE')).to.be.false;
            done();
        });

        it('parsing a boolean value should work correctly', done => {
            expect(util.parseBoolean(true)).to.be.true;
            expect(util.parseBoolean(false)).to.be.false;
            done();
        });

        it('parsing a value in non-strict mode should work correctly', done => {
            expect(util.parseBoolean('abc', false)).to.be.true;
            expect(util.parseBoolean(1, false)).to.be.true;
            expect(util.parseBoolean(true, false)).to.be.true;
            expect(util.parseBoolean({}, false)).to.be.true;

            expect(util.parseBoolean('', false)).to.be.false;
            expect(util.parseBoolean(0, false)).to.be.false;
            expect(util.parseBoolean(false, false)).to.be.false;
            done();
        });

        it('parsing an invalid value should return an error', done => {
            expect(util.parseBoolean('abc')).to.be.instanceof(TypeError);
            expect(util.parseBoolean(123)).to.be.instanceof(TypeError);
            expect(util.parseBoolean({ test: 'testing'})).to.be.instanceof(TypeError);
            expect(util.parseBoolean(['testing', 123])).to.be.instanceof(TypeError);
            done();
        });
    });
});

// HELPERS
// =================================================================================================
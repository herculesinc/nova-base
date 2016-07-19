///<reference path="../typings/index.d.ts"/>
import * as chai from 'chai';
const expect = chai.expect;

describe('My context', () => {
  describe('Some event', () => {
    it('should result in something', () => {

      expect(true).to.eq(false);
    });
  });
});

/* global describe, it, expect */
var assert = require('assert');
describe('progressive-config', function () {
  var d = __dirname;
  describe('one', function () {
    it('should load a configuration', function () {
      config = require('../progressive-config.js').default({}, "./test");
      assert.equal(config.test.test1, 1);
    });
    it('should apply a handlbars definition', function () {
      config = require('../progressive-config.js').default({}, "./test");
      assert.equal(config.test.test2, "testvalue");
    })

  })

})

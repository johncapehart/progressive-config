/* global describe, it, expect */
var assert = require('assert');
describe('progressive-config', function () {
  var d = __dirname;
  describe('one', function () {
    it('should load a configuration', function () {
      var config = require('../progressive-config.js').default({}, "./test/test");
      assert.equal(config.test.A, 1);
    });
    it('should apply a handlbars definition', function () {
      var config = require('../progressive-config.js').default({}, "./test/test");
      assert.equal(config.test.B, "testvalue1");
    });
    it('should skip a bad file', function () {
      var config = require('../progressive-config.js').default({}, "./test/badtest");
      assert.equal(config.test.A, 4);
      assert.equal(config.test.B, "testvalue4");
    });
    it('should overwrite with later values', function () {
      var pc = require('../progressive-config.js').default;
      var config = pc({}, "./test/test");
      config = pc(config, "./test/test2");
      assert.equal(config.test.A, 2);
      assert.equal(config.test.C, "testC")
    });
    it('should handle files before directories', function () {
      var config = require('../progressive-config.js').default({}, "./test/nestedtest");
      assert.equal(config.test.A, 4);
      assert.equal(config.test.D, 44);
    });

  })
})

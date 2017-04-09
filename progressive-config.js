'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
const Handlebars = require('handlebars');
var uuid = require('node-uuid');

// called when the template contains {{uuid}}
Handlebars.registerHelper("uuid", function(/* [args, ] options */) {
  return uuid.v4();
});

exports.dropMissingFieldNames = function(/* [args, ] options */) {
  var options = arguments[arguments.length - 1];
  return '';
};

exports.keepMissingFieldNames =function(/* [args, ] options */) {
  var options = arguments[arguments.length - 1];
  return '{{{' + options.name + '}}}';
};

var helpers = require('handlebars-helpers')({
  handlebars: Handlebars
});

var helpers = require('handlebars-helpers')({
  handlebars: Handlebars
});

var localLog = console;
if (!!process.console && !!process.console.file) {
  localLog = process.console.file();
  if (!localLog.warn) {
    localLog.warn = localLog.warning;
  }
}
localLog.info("loading progressive-config.js");

exports.default = function(initial, inputs, selectors, fileMerger, directoryMerger, templateFunction) {
  return exports.default2({
    initial: initial,
    inputs: inputs,
    selectors: selectors,
    fileMerger: fileMerger,
    directoryMerger: directoryMerger,
    templateFunction: templateFunction
  });
};

exports.default2 = function({
  initial : initial,
  inputs: inputs,
  selectors: selectors,
  fileMerger: fileMerger,
  directoryMerger: directoryMerger,
  templateFunction: templateFunction
}) {
  // make sure result is a deep clone
  var config = _.merge({}, initial);
  config.__dirname = (config.__dirname || []);
  config.__dirname.push(__dirname);

  config.__inputs = config.__inputs || [];
  config.$dynamic = config.$dynamic || {};
  config.$dynamic.root = config.$dynamic.root || config;
  if (!!inputs) {
    inputs = Array.isArray(inputs) ? inputs : [inputs];
    _.map(inputs, function(i) {
      config.__inputs.push(path.resolve(i));
    });
  }

  config.__selectors = config.__selectors || [];
  if (!!selectors) {
    selectors = Array.isArray(selectors) ? selectors : [selectors];
    config.__selectors.push(selectors);
  }

  exports.defaultFilter = function(key, value) {
    if (key.lastIndexOf('$', 0) === 0) {
      return null;
    }
    return value;
  }

  exports.defaultStringify = function(c) {
    return JSON.stringify(c, exports.defaultFilter);
  }

  exports.defaultApplyTemplate = function(c) {
    // make a template from the definitions node
    if (!!c.definitions) {
      // re-register this helper in case it has been changed
      Handlebars.registerHelper('helperMissing', exports.keepMissingFieldNames);

      var definitionsTemplate = Handlebars.compile(JSON.stringify(c.definitions));
      // apply the whole configuration to the definitions template
      var definitions = JSON.parse(definitionsTemplate(c));
      // make a template from the whole configuration
      var t = Handlebars.compile(exports.defaultStringify(c));
      // apply the definitions to the whole configuration as a template
      return JSON.parse(t(definitions));
    } else {
      return c;
    }
  };

  exports.iterativelyApplyTemplate = function(c) {
    var c0;
    do {
      c0 = c;
      c = exports.defaultApplyTemplate(c0);
    } while (!_.isEqual(c, c0));
    return c;
  };

  exports.defaultFileMerger = function(_o, _i) {
    var o = _.merge({}, _o, _i);
    return o;
  };

  /*
   // prove that arrays are not merged
   var a = { a: [1,2,3], b: 0, c: 2};
   var b = { a: [3,4,5,6], b: 1};
   var c = _.merge(a,b); // returns "{\"a\":[3,4,5,6],\"b\":1,\"c\":2}"
   */

  exports.readDirectory = function(i) {
    var children = fs.readdirSync(i);
    var filesWithStats = [];
    _.each(children, function(child) {
      var fpath = path.resolve(i, child);
      var fileStats = fs.statSync(fpath);

      filesWithStats.push({
        path: fpath,
        isdir: fileStats.isDirectory() ? "b" : "a"
      });
      child = null;
    });
    var r = _.sortBy(filesWithStats, ['isdir']);
    return _(filesWithStats)
      .sortBy(['isdir', 'path'])
      .map(function(f) {
        return f.path;
      })
      .value();
  };

  exports.defaultDirectoryMerge = function(o, i) {
    if (fs.existsSync(i)) {
      var fstat = fs.statSync(i);
      if (fstat.isDirectory()) {
        var children = exports.readDirectory(i);
        _.map(children, function(c) {
          o = config.__directoryMerger(o, c);
        });
      } else {
        if (/config\.(js|json|yml)$/.test(i)) {
          localLog.info("Loading configuration from " + i);
          var j = {};
          try {
            if ((/\.yml$/.test(i))) {
              j = yaml.safeLoad(fs.readFileSync(i, 'utf8'));
            } else {
              j = require(i);
            }
          } catch (err) {
            localLog.warn(err.message);
          }
          o = config.__fileMerger(o, j);
        }
      }
    }
    return o;
  };

  // TODO: Put these functions in $dynamic node
  config.__fileMerger = (fileMerger === undefined) ? exports.defaultFileMerger : fileMerger;
  config.__directoryMerger = (directoryMerger === undefined) ? exports.defaultDirectoryMerge : directoryMerger;
  config.__templateFunction = (templateFunction === undefined) ? exports.defaultApplyTemplate : templateFunction;
  config.__walkInputs = function(cb) {
    var rinputs = this.__inputs.reverse();
    return _.transform(rinputs, cb);
  };

  config.__getRelativePath = function(nodeName, fileName) {
    var resultantPath = this[nodeName][fileName];
    // check for relative path
    if (path.resolve(resultantPath) !== path.normalize(resultantPath)) {
      var result = this.__walkInputs(function(result, ith) {
        var jobTemplatePath2 = path.join(ith, resultantPath);
        if (fs.existsSync(jobTemplatePath2)) {
          result.push(jobTemplatePath2);
          return false;
        }
        jobTemplatePath2 = path.join(ith, nodeName, resultantPath);
        if (fs.existsSync(jobTemplatePath2)) {
          result.push(jobTemplatePath2);
          return false;
        }
      });
      if (!!result) {
        return result[0];
      }
      return null;
    } else {
      return resultantPath;
    }
  };

  // process only new directories
  if (!!inputs) {
    _.map(inputs, function(i) {
      try {
        config = exports.defaultDirectoryMerge(config, i);
      } catch (err) {
        localLog.warn(err.message);
      }
    });
  }

  // process all selectors
  _.map(config.__selectors, function(s1) {
    _.map(s1, function(s2) {
      config = _.merge(config, config[config[s2]]);
    });
  });

  if (!!config.__templateFunction) {
    var templateResult = config.__templateFunction(config);
    var templateResult2 = _.omit(templateResult, ['$dynamic', 'definitions']);
    config = _.merge(config, templateResult2);
  }
  return config;
};

exports.reload = function(config) {
  // TODO: actually reload the config by iterateing over the __dirnames and inputs
  return _.merge({}, config);
};

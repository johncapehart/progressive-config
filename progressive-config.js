'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
const Handlebars = require('handlebars');

exports.default = function (initial, inputs, selectors, fileMerger, directoryMerger, templateFunction) {
    // make sure result is a deep clone
    var config = _.merge({}, initial);
    config.__dirname = (config.__dirname || []);
    config.__dirname.push(__dirname);

    config.__inputs =  config.__inputs || [];
    if (!!inputs) {
        inputs = (typeof inputs === "object") ? inputs : [inputs];
        config.__inputs.push(inputs);
    }

    config.__selectors =  config.__selectors || [];
    if (!!selectors) {
        selectors = (typeof selectors === "object") ? selectors : [selectors];
        config.__selectors.push(selectors);
    }

    function applyTemplate(c) {
        var t = Handlebars.comiple(config);
        t(config);
    }

    exports.defaultMerge = function (_o, _i) {
        return _.merge({}, _o, _i);
    };

    exports.defaultDirectoryMerge = function (o, i) {
        if (fs.existsSync(i)) {
            var fstat = fs.statSync(i);
            if (fstat.isDirectory()) {
                var children = fs.readdirSync(i);
                _.map(children, function (c) {
                    var fpath = path.join(i, c);
                    o = directoryMerger(o, fpath);
                });
                return o;
            } else {
                if (/config\.(js|json|yml)$/.test(i)) {
                    console.log("Loading configuration from " + i);
                    var j;
                    if ((/\.yml$/.test(i))) {
                        j = yaml.safeLoad(fs.readFileSync(i, 'utf8'));
                    } else {
                        j = require(i);
                    }
                    return fileMerger(o, j);
                }
            }
        }
        return o;
    };

    fileMerger = (fileMerger === undefined) ? exports.defaultMerge : fileMerger;
    directoryMerger = (directoryMerger === undefined) ? exports.defaultDirectoryMerge : directoryMerger;
    templateFunction = (templateFunction === undefined) ? applyTemplate : templateFunction;

    // process only new directories
    if (!!inputs) {
        _.map(inputs, function (i) {
            config = exports.defaultDirectoryMerge(config, i);
        });
    }

    // process all selectors
    _.map(config.__selectors, function (s1) {
        _.map(s1, function (s2) {
            config = _.merge(config, config[config[s2]]);
        });
    });

    return config;
};

exports.reload = function (config) {
    //TODO: actually reload the config by iderateing over the __dirnames and inputs
    return _.merge({}, config);
};

/*
 * Copyright 2013-2015 Intel Corporation.
 * 
 * See the file LICENSE for copying permission.
 */
"use strict";
var path = require('path');

var Factory = require('./factory'),
    requirejs = require('requirejs');

var preProcessor = require('./preProcessor'),
    cssFilesChecker = require('./checkCssFiles'),
    lintReporter = require('./generateLintReport'),
    postProcessor = require('./postProcessor');

// config requirejs
requirejs.config({
    baseUrl: path.join(__dirname, '..', '..'),
    nodeRequire: require,
    paths: {
        lint: 'lib/lint',
        text: 'lib/lint/thirdparty/rjs_plugins/text'
    }
});

cssFilesChecker.loadCssChecker(requirejs('lint/css/cssChecker'));
cssFilesChecker.loadDataManager(requirejs('lint/dataManager'));

function XLint() {}

require('util').inherits(XLint, require('events').EventEmitter);

XLint.prototype.do = function(input, callback) {
    try {
        parseOption(input);
        input.eventEmitter = this;
        if (input.runFromConsole) {
            setupProgressBar(this);
        }
    } catch (e) {
        callback(e);
    }
    var line;
    line = new Factory.Line([preProcessor, cssFilesChecker, lintReporter, postProcessor], input, callback);
    line.start();
};

function setupProgressBar(o) {
    var ProgressBar = require('progress'), bar;
    o.on('progress', function(status) {
        if (status.phase === 'Start') {
            bar = new ProgressBar('[:bar] :percent :phase :file', {
                complete: '=',
                incomplete: ' ',
                width: 50,
                total: status.total
            });
        } else {
            bar.tick({'phase': status.phase + ' --> ', 'file': status.file});
            if (bar.curr === bar.total) {
                // print the log
                bar.curr--;
                bar.tick({'phase': 'DONE!', 'file': ''});
                // one more tick to let progress bar complete.
                bar.tick();
                console.log();
            }
        }
    });
}

function parseOption(option) {
    var filePath, profile, browser, platforms, i, length, exist, toDevicesList;

    if (option.toRuntimes) {
        platforms = [];
        option.toRuntimes.forEach(function(runtime) {
            var runtimeId = runtime.name + (runtime.version?'_'+runtime.version:'');
            runtimeId = runtimeId.toLowerCase();
            // avoid same platforms
            exist = false;
            for (i = 0, length = platforms.length; i < length; i++) {
                if (platforms[i].platformId === runtimeId) {
                    exist = true;
                    break;
                }
            }
            if (!exist) {
                platforms.push({
                    'platformId': runtimeId,
                    'browser': runtime
                });
            }
        });
        option.targetPlatforms = platforms;
    } else {
        throw 'target platforms should be provided!';
    }
}

if (module && "exports" in module) {
    module.exports = new XLint();
}
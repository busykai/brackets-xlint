/*
 * Copyright 2013-2015 Intel Corporation.
 * 
 * See the file LICENSE for copying permission.
 */
"use strict";
var Factory = require('./factory'),
    path = require('path');

var fs;
var cssChecker, dataManager;

function checkCssFiles() {}
Factory.extend(checkCssFiles, Factory.Machine);

checkCssFiles.prototype.action = function (input) {

    var self = this,
        fileCheckers;

    // Jump to next machine if NO css file in input
    if (input.css.length <= 0) {
        this.output = input;
        this.done();
        return;
    }

    dataManager.init(['css'], input.options.targetPlatforms, function(err) {
        if (err) {
            console.log('ERROR to init data manager!');
            self.fail(err);
            return;
        }
        cssChecker.init(input.options, function(err) {
            if (err) {
                console.log('ERROR to init CSS Checker!');
                self.fail(err);
                return;
            }

            fs = require('fs');

            fileCheckers = [];
            input.css.forEach(function(cssFile) {
                fileCheckers.push(function() {
                    var _self = this;
                    checkFile(cssFile, function(err) {
                        if (err) {
                            console.log('ERROR when check css file ' + cssFile.path);
                            _self.fail(err);
                            return;
                        }
                        _self.done();
                    });
                });
            });

            Factory.series(fileCheckers, function(err) {
                if (err) {
                    self.fail(err);
                    return;
                }
                self.output = self.input;
                self.done();
            });
        });
    });

    function checkFile(file, callback) {
                
        // update progress
        input.eventEmitter.emit(
            'progress',
            {
                'phase': 'Lint CSS File',
                'progress': ++input.numberOfDealtFiles,
                'file': path.basename(file.path)
            }
        );
        
        fs.readFile(file.path, {encoding: "utf8"}, function (err, css) {
            if (err) {
                callback(err);
                return;
            }

            try {
                file.problems = cssChecker.checkCss(css, input.options).problems;
                callback(null);
            } catch (e) {
                callback(e);
                return;
            }
        });
    }
};

checkCssFiles.prototype.loadCssChecker = function(checker) {
    if (!cssChecker) {
        cssChecker = checker;
    }
};

checkCssFiles.prototype.loadDataManager = function(manager) {
    if (!dataManager) {
        dataManager = manager;
    }
};

if (module && "exports" in module) {
    module.exports = new checkCssFiles();
}
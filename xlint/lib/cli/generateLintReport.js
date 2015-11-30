/*
 * Copyright 2013-2015 Intel Corporation.
 * 
 * See the file LICENSE for copying permission.
 */
"use strict";

var Factory = require('./factory'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    myUtils = require('./myUtils'),
    problemLevel = require('../lint/problemInfo').problemLevel;

function generateLintReport() {}
Factory.extend(generateLintReport, Factory.Machine);

generateLintReport.prototype.action = function (input) {
    var self = this, jsonReport, jsonReportFileName;

    if (input.options.convert) {
        self.output = self.input;
        self.done();
        return;
    } else {
        // output to a json file
        jsonReportFileName = path.basename(input.options.input) + '.json';
        input.options.outputReportName = jsonReportFileName;
        mkdirp(myUtils.escape(input.options.output), function(err1) {
            if (err1) {
                self.errorOccured(err1);
                return;
            }
            require('fs').writeFile(path.join(input.options.output, jsonReportFileName), JSON.stringify(generateJsonReport(input)), function(err2) {
                if (err2) {
                    self.errorOccured(err2);
                    return;
                }        
                self.output = self.input;
                self.done();
            });
        });
    }
};

generateLintReport.prototype.errorOccured = function (msg) {
    console.log('\u001b[31m');
    console.log('*****ERROR***** when generate report.');
    console.log('*****ERROR***** message: ' + msg);
    console.log('\u001b[0m');
    this.fail(msg);
};

function generateJsonReport(input) {
    function initRuleObject(type) {
        return {
            'type': type,
            'error': 0,
            'warning': 0,
            'advice': 0,
            'fixed': {'error': 0, 'warning': 0, 'advice': 0},
            'problems': []
        };
    }
    function initFileObject(filePath) {
        var fileName = path.basename(filePath);
        return {
            'filePath': filePath,
            'fileName': fileName,
            'error': 0,
            'warning': 0,
            'advice': 0,
            'fixed': {'error': 0, 'warning': 0, 'advice': 0},
            'problems': {}
        };
    }

    var result = {
        'error': 0,
        'warning': 0,
        'advice': 0,
        'fixed': {'error': 0, 'warning': 0, 'advice': 0},
        'problems': {}
    };
    var problems = {}, files = [];

    [input.css, input.html, input.js].forEach(function(_files) {
        if (_files) {
            files = files.concat(_files);
        }
    });

    files.forEach(function(file) {
        var filePath;
        if (!file.problems || typeof file.problems !== 'object') {
            return;
        }

        filePath = path.relative(input.root, file.path);
        result.problems[filePath] = initFileObject(filePath);
        file.problems.forEach(function(problem) {
            if (problem.type > 80 && problem.type <= 100) {
                // This is a problem of HTML
                // problem.evidence could include special HTML character
                problem.evidence = escapeHTMLContent(problem.evidence);
            }
            if (!result.problems[filePath].problems[problem.line]) {
                result.problems[filePath].problems[problem.line] = [problem];
            } else {
                result.problems[filePath].problems[problem.line].push(problem);
            }
            switch(problem.level) {
            case problemLevel.ERROR:
                result.error++;
                result.problems[filePath].error++;
                if (problem.fixed) {
                    result.fixed.error++;
                    result.problems[filePath].fixed.error++;
                }
                break;
            case problemLevel.WARNING:
                result.warning++;
                result.problems[filePath].warning++;
                if (problem.fixed) {
                    result.fixed.warning++;
                    result.problems[filePath].fixed.warning++;
                }
                break;
            case problemLevel.ADVICE:
                result.advice++;
                result.problems[filePath].advice++;
                if (problem.fixed) {
                    result.fixed.advice++;
                    result.problems[filePath].fixed.advice++;
                }
                break;
            }
        });
    });

    return result;
}

function escapeHTMLContent( text ) {
    return text.replace( /&/g, "&amp;" )
             .replace( /'/g, "&#39;" )
             .replace( /"/g, "&quot;")
             .replace( />/g, "&gt;" )
             .replace( /</g, "&lt;" );
}

if (module && "exports" in module) {
    module.exports = new generateLintReport();
}


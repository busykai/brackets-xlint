#!/usr/bin/env node
/*
 * Copyright 2013-2015 Intel Corporation.
 * 
 * See the file LICENSE for copying permission.
 */
"use strict";

var exec, cliOptions, options;

function processopt(argv) {
    var opt = {},
        optDescription = {
            'm': 'Set it to "library" to disable progress bar.',
            'i': 'Specify the path to your web app.',
            'o': 'Specify the out path to place report file and converted web app.',
            'target-platform': 'Specify the platform or comma-seperated platforms on which you want to port your web app.'
        },
        result = require('optimist')(argv)
            .usage('Check compatibility problems of your HTML5 project. \nUsage: $0')
            .string(['i', 'o', 'm', 'target-platform'])
            .demand(['i', 'o', 'target-platform'])
            .describe(optDescription)
            .argv;

    if (result.i) {opt.i = result.i;}
    if (result.o) {opt.o = result.o;}
    if (result.m) {opt.m = result.m;}
    if (result['target-platform']) {
        opt['target-platform'] = result['target-platform'].split(',');
    }
    return opt;
}

function startXlint() {
    require('../lib/cli/xlint').do(options, function (err, output) {
        if (err) {
            throw err;
        }
        if (output.reportPath) {
            console.log('Check X-Lint report at "' + output.reportPath + '"');
        }
    });
}

exec = require('child_process').exec;
cliOptions = processopt(process.argv);
options = {
    runFromConsole: true,
    input: cliOptions.i,
    output: cliOptions.o
};

if (cliOptions.m === 'library') {
    options.runFromConsole = false;
}

options.toRuntimes = [];
cliOptions['target-platform'].forEach(function(runtimeStr) {
    var runtimeArray, runtimeObj;
    runtimeArray = runtimeStr.split('/');
    runtimeObj = {'name': runtimeArray[0]};
    if (runtimeArray[1]) {
        runtimeObj.version = runtimeArray[1];
    }
    options.toRuntimes.push(runtimeObj);
});

// toRuntime must be provided!
if (!options.toRuntimes || options.toRuntimes.length === 0) {
    console.log('ERROR: The target platform has not been found!');
    return;
}

startXlint();
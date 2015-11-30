/*
 * Copyright 2013-2015 Intel Corporation.
 * 
 * See the file LICENSE for copying permission.
 */
"use strict";
var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');

var inputFilesDir = path.join(__dirname, "data", "input");
var outputFilesDir = path.join(__dirname, "data", "output");
var expectedFilesDir = path.join(__dirname, "data", "expect", "json");
var jasmineSpecsDir = path.join(__dirname, "spec");

var targetPlatforms = require('./targetPlatforms.json');
var targetPlatformIds =[];
targetPlatforms.forEach(function(targetPlatform) {
    targetPlatformIds.push(targetPlatform.name + "_" + targetPlatform.version);
});

var ProgressBar = require('progress');
var bar;

function setupProgressBar(total) {
    bar = new ProgressBar('[:bar] :percent', {
        complete: '=',
        incomplete: ' ',
        width: 50,
        total: total
    });
}

function tickProgressBar() {
    bar.tick({});
    if (bar.curr === bar.total) {
        // print the log
        bar.curr--;
        bar.tick({});
        // one more tick to let progress bar complete.
        bar.tick();
        console.log();
    }
}

clearOldFiles(function(err) {
    if (err) {
        throw err;
    }
    console.log("\nRunning jasmine test\nBuild:");
    generateReport();
});

function clearOldFiles(callback) {
    rimraf(outputFilesDir, function(err) {
        if (err) {
            console.log("ERROR to remove the output directory!!!");
            callback(err);
            return;
        }
        mkdirp(outputFilesDir, function(err) {
            if (err) {
                console.log("ERROR to create new output directory!!!");
                callback(err);
                return;
            }
            rimraf(jasmineSpecsDir, function(err) {
                if (err) {
                    console.log("ERROR to remove the jasmine specs directory!!!");
                    callback(err);
                    return;
                }
                mkdirp(jasmineSpecsDir, function(err) {
                    if (err) {
                        console.log("ERROR to create new jasmine spec directory!!!");
                        callback(err);
                        return;
                    }
                    callback();
                });
            });
        });
    });
}

// run xlint to generate the report
function generateReport() {
    fs.readdir(inputFilesDir, function(err, files) {
        if (err) {
            throw err;
        }
        var counter = files.length * targetPlatformIds.length;
        setupProgressBar(counter);
        targetPlatformIds.forEach(function(targetPlatformId) {
            files.forEach(function(file) {
                var cmd = "node " + path.join(__dirname, "..", "bin", "cli.js") +
                          " --target-platform " + targetPlatformId +
                          " -i " + path.join(inputFilesDir, file) +
                          " -o " + path.join(outputFilesDir, targetPlatformId) +
                          " -m library";
                cmd = cmd.replace(/\\/g, "\\\\");
                exec(cmd, function(err, stdout, stderr) {
                    if (err) {
                        throw err;
                    }
                    counter--;
                    tickProgressBar();
                    if (counter === 0) {
                        console.log();
                        console.log("Test:");
                        generateJasmineSpec(files);
                    }
                });
            });
        });
    });
}

// generate jasmine spec
function generateJasmineSpec(inputFileNames) {
    targetPlatformIds.forEach(function(targetPlatformId) {
        var specFileContent = "describe('" + targetPlatformId + "', function(){\n\n__test_items__});";
        var testItemsContent = "";
        inputFileNames.forEach(function(filename) {
            var outputFile = path.join(outputFilesDir, targetPlatformId, filename + ".json").replace(/\\/g, '\\\\');
            var expectedFile = path.join(expectedFilesDir, targetPlatformId, filename + ".json").replace(/\\/g, '\\\\');
            testItemsContent += "it('" + filename + "', function(done){\n" +
                                "   var fs = require('fs');\n" +
                                "   fs.readFile('" + outputFile + "', {encoding: 'utf8'}, function(err, outputReport) {\n" +
                                "       if (err) throw err;\n" +
                                "       fs.readFile('" + expectedFile + "', {encoding: 'utf8'}, function(err, expectedReport) {\n" +
                                "           if (err) throw err;\n" +
                                "           var result = (outputReport === expectedReport);\n" +
                                "           expect(result).toEqual(true);\n" +
                                "           done();\n" +
                                "       });\n" +
                                "   });\n" +
                                "});\n\n";
        });
        specFileContent = specFileContent.replace('__test_items__', testItemsContent);
        fs.writeFile(path.join(jasmineSpecsDir, targetPlatformId + ".spec.js"), specFileContent, function(err) {
            if (err) {
                throw err;
            }
        });
    });
}
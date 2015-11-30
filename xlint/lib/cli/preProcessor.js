/*
 * Copyright 2013-2015 Intel Corporation.
 * 
 * See the file LICENSE for copying permission.
 */
"use strict";

var path = require('path'),
    os = require('os');
var Factory = require('./factory'),
    File = require('./webFiles').File,
    WebFiles = require('./webFiles').WebFiles,
    myUtils = require('./myUtils');

var fs;

function PreProcessor(){}
Factory.extend(PreProcessor, Factory.Machine);

PreProcessor.prototype.action = function (input) {
    var self = this;
    
    var output;
    
    fs = require('fs');

    try {
        if (fs.statSync(input.input).isDirectory()) {
            input.inputIsDirectory = true;
            input.inputIsFile = false;
        } else {
            if (/(.html|.htm|.js|.css)$/i.test(path.basename(input.input))) {
                input.inputIsFile = true;
                input.inputIsDirectory = false;
            } else {
                self.fail('Please input a html/js/css file!');
                return;
            }
        }
    } catch (e) {
        console.log(e);
        self.fail('Please check your input!');
        return;
    }

    output = generateFilesRepresentation({
        isDirectory: input.inputIsDirectory,
        path: path.normalize(input.input)
    });
    
    output.options = input;

    output.numberOfTotalFiles = output.css.length;
    output.numberOfDealtFiles = 0;  
    output.eventEmitter = input.eventEmitter;

    // update progress
    input.eventEmitter.emit(
        'progress',
        {
            'phase': 'Start',
            'progress': 0,
            'total': output.numberOfTotalFiles
        }
    );

    self.output = output;
    self.done();
};

function generateFilesRepresentation(fileInfo) {
    var ext2type = {
            "css": "css",
            "htm": "html",
            "html": "html",
            "js": "js"
        },
        files;
    if (fileInfo.isDirectory) {
        files = new WebFiles(fileInfo.path);
    } else {
        files = new WebFiles(path.dirname(fileInfo.path));
    }

    (function traverse(filePath) {
        if (fs.statSync(filePath).isDirectory()) {
            fs.readdirSync(filePath).forEach(function(child){traverse(path.normalize(filePath + path.sep + child));});
        } else {
            var i, ext, type, file;
            i = filePath.lastIndexOf('.');
            ext = (i < 0?'':filePath.substr(++i)).toLowerCase();
            type = ext2type[ext];
            if (type) {
                file = new File(filePath);
                file.type = type;
                files.addFile(type, file);
            }
        }
    })(fileInfo.path);

    return files;
}

if (module && "exports" in module) {
    module.exports = new PreProcessor();
}


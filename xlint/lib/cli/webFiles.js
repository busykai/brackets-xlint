/*
 * Copyright 2013-2015 Intel Corporation.
 * 
 * See the file LICENSE for copying permission.
 */
"use strict";

var File = function(path) {
    this.path = path;
};
File.prototype = {
	path: '',
	type: ''
};

var WebFiles = function(root) {
    this.root = root;
};

WebFiles.prototype.constructor = WebFiles;

WebFiles.prototype.addFile = function(type, file) {
    if (!this[type]) {
        this[type] = [];
    }
    this[type].push(file);
};

if (module && "exports" in module) {
    module.exports.File = File;
    module.exports.WebFiles = WebFiles;
}


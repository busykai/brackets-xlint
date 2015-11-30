/*
 * Copyright 2013-2015 Intel Corporation.
 * 
 * See the file LICENSE for copying permission.
 */
"use strict";

var path = require('path'),
    Factory = require('./factory');

function PostProcessor() {}
Factory.extend(PostProcessor, Factory.Machine);

PostProcessor.prototype.action = function (input) {
    this.output = {};
    this.output.reportPath = path.join(input.options.output, input.options.outputReportName);
    this.done();
};

if (module && "exports" in module) {
    module.exports = new PostProcessor();
}

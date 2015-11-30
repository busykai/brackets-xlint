/*
 * Copyright 2013-2015 Intel Corporation.
 * 
 * See the file LICENSE for copying permission.
 */
"use strict";

var fs = require('fs'),
    os = require('os'),
    util = require('util');

function generateRandomString(len) {
    var charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
        var randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
}

function escape(str) {
    return str.replace(/\s/g, '\\ ')
              .replace(/'/g, '\\\'');
}

function logObject(o) {
    console.log(util.inspect(o, false, null));
}

if (module && "exports" in module) {
    module.exports.generateRandomString = generateRandomString;
    module.exports.logObject = logObject;
    module.exports.escape = escape;
}
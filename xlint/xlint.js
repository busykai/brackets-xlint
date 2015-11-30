/*
 * Copyright 2013-2015 Intel Corporation.
 * 
 * See the file LICENSE for copying permission.
 */
var define;
if (typeof define !== 'function') {
    define = require('amdefine')(module);
}

define(function(require) {
    "use strict";
    var cssChecker = require('./lib/lint/css/cssChecker');
    var htmlChecker = require('./lib/lint/html/htmlChecker');
    var mediaChecker = require('./lib/lint/media/mediaChecker');
    var dataManager = require('./lib/lint/dataManager');


    function init(config, callback) {
        var targetPlatforms, features;
        targetPlatforms = config.targetPlatforms;
        features = config.features || ["css", "html", "media"];
        dataManager.init(features, targetPlatforms, function(err) {
            if (err) {
                callback(err);
                return;
            }
            cssChecker.init(config, function(err) {
                if (err) {
                    callback(err);
                    return;
                }
                htmlChecker.init(config, function(err) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    mediaChecker.init(config, callback);
                });
            });
        });
    }
    
    return {
        init     : init,
        checkCss : cssChecker.checkCss,
        checkHTML: htmlChecker.checkHTML
    };
});
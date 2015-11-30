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
    
    var dataManager = require('../dataManager');

    var ERRORMSG = {
        noCompatibilityData: "No media compatibility data for platform "
    };

    function getCompatibility(targetPlatformId, mediaType, codecs) {
        var compatibilityData = getData(targetPlatformId);

        if (!compatibilityData[mediaType]) {
            return "unknown";
        }

        // TODO: if there are information of codecs then check it

        // undefined : supported
        // "y"       : supported
        // "n"       : not supported
        return compatibilityData[mediaType]._supported;
    }

    function getData(platformId) {
        var data = dataManager.getData('media', platformId);
        if (!data) {
            throw ERRORMSG.noCompatibilityData + platformId;
        }

        return data["compatibility-data"];
    }

    return {
        getCompatibility : getCompatibility
    };
});
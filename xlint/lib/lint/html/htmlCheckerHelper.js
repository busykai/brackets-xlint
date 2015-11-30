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
        noCompatibilityData: "No HTML compatibility data for platform "
    };

    function getTagCompatibility(targetPlatformId, tag) {
        var compatibilityData = getData(targetPlatformId);

        // key names that start with "_" are private in the compatibility data
        if (!compatibilityData[tag] || tag[0] === "_") {
            return "unknown";
        }

        // undefined : supported
        // "y"       : supported
        // "n"       : not supported
        return compatibilityData[tag]._supported;
    }

    function getAttributeCompatibility(targetPlatformId, tag, attribute) {
        var compatibilityData = getData(targetPlatformId);


        // key names that start with "_" are private in the compatibility data
        if (!compatibilityData[tag] || tag[0] === "_" ||
            !compatibilityData[tag][attribute] || attribute[0] === "_") {
            if (compatibilityData["*"] && compatibilityData["*"][attribute]) {
                return compatibilityData["*"][attribute]._supported;
            }
            return "unknown";
        }

        // undefined : supported
        // "y"       : supported
        // "n"       : not supported
        return compatibilityData[tag][attribute]._supported;
    }

    function getValueCompatibility(targetPlatformId, tag, attribute, value) {
        var compatibilityData = getData(targetPlatformId);

        // key names that start with "_" are private in the compatibility data
        if (!compatibilityData[tag] || tag[0] === "_" ||
            !compatibilityData[tag][attribute] || attribute[0] === "_" ||
            !compatibilityData[tag][attribute][value] || value[0] === "_") {
            if (compatibilityData["*"] && compatibilityData["*"][attribute] &&
                compatibilityData["*"][attribute][value]) {
                return compatibilityData["*"][attribute][value]._supported;
            }
            return "unknown";
        }

        // undefined : supported
        // "y"       : supported
        // "n"       : not supported
        return compatibilityData[tag][attribute][value]._supported;

    }

    function getData(platformId) {
        var data = dataManager.getData('html', platformId);
        if (!data) {
            throw ERRORMSG.noCompatibilityData + platformId;
        }

        return data["compatibility-data"];
    }

    return {
        getTagCompatibility       :  getTagCompatibility,
        getAttributeCompatibility :  getAttributeCompatibility,
        getValueCompatibility     :  getValueCompatibility
    };
});
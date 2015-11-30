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

    // The data is stored in the variable "compatibilityData" declared below, the layout of compatibilityData is
    // {
    //     featureName : {
    //         platformId : {
    //             ...the data...
    //         }
    //     },
    //     ...
    // }
    // Here the platformId is a regular ID. User may specify a target platform like "android_4.0.4" or just
    // "android_4.0", both are matched to regular ID "android_4.0.x", which corresponds to the ID used to name
    // the data file.
    var compatibilityData = {};

    // Map from lowercased user specified platform ID to regular platform ID
    var platformIdMap = {};
    var availablePlatforms = [
        {name: "android", version: "2.3.x"},
        {name: "android", version: "4.0.x"},
        {name: "android", version: "4.1.x"},
        {name: "android", version: "4.2.x"},
        {name: "android", version: "4.3.x"},
        {name: "android", version: "4.4"},
        {name: "ios", version: "6.x"},
        {name: "ios", version: "7.x"},
        {name: "winph", version: "8.0"},
        {name: "chrome", version: "31"}
    ];
    var availableFeatures = ['css', 'js', 'html', 'media'];

    function init(features, platforms, callback) {
        loadData(features, platforms, callback);
    }

    function loadData(features, platforms, callback) {
        var deps = [], depsInfo = [], lowercasedPlatformId, regularPlatformId, errorOccured = false, i;

        if (Object.prototype.toString.call(features) !== '[object Array]') {
            callback('features must be an array');
            return;
        }

        if (Object.prototype.toString.call(platforms) !== '[object Array]') {
            callback('platforms must be an array');
            return;
        }

        for (i = features.length - 1; i >= 0; i--) {
            if (Object.prototype.toString.call(features[i]) !== '[object String]') {
                callback('feature must be a string');
                return;
            }
            if (availableFeatures.indexOf(features[i].toLowerCase()) === -1) {
                callback('no compatibility data for ' + features[i]);
                return;
            }
            features[i] = features[i].toLowerCase();
        }

        for (i = platforms.length - 1; i >= 0; i--) {
            if (Object.prototype.toString.call(platforms[i].platformId) !== '[object String]') {
                callback('platform ID must be a string');
                return;
            }

            // build the map from lowercased user specified platform ID to regular platform ID
            lowercasedPlatformId = platforms[i].platformId.toLowerCase();
            if (!platformIdMap[lowercasedPlatformId]) {
                regularPlatformId = getRegularPlatformId(lowercasedPlatformId);
                if (!regularPlatformId) {
                    callback("no compatibility data for " + platforms[i].platformId);
                    return;
                }
                platformIdMap[lowercasedPlatformId] = regularPlatformId;
            }
        }

        features.forEach(function(feature) {
            platforms.forEach(function(platform) {
                var lowercasedPlatformId, regularPlatformId;
                lowercasedPlatformId = platform.platformId.toLowerCase();
                regularPlatformId = platformIdMap[lowercasedPlatformId];
                if (compatibilityData[feature] && compatibilityData[feature][regularPlatformId]) {
                    return;
                }
                depsInfo.push({
                    feature: feature,
                    originalPlatformId: platform.platformId,
                    lowercasedPlatformId: lowercasedPlatformId,
                    regularPlatformId: regularPlatformId
                });
                deps.push('text!' + "./data/" + feature + "/data-" + regularPlatformId + ".json");
            });
        });
        require(deps, function() {
            var requiredData = arguments;
            var i;
            try {
                for (i = depsInfo.length - 1; i >= 0; i--) {
                    if (!requiredData[i]) {
                        callback("Unable to load data for " + depsInfo[i].originalPlatformId);
                        return;
                    }
                    if (!compatibilityData[depsInfo[i].feature]) {
                        compatibilityData[depsInfo[i].feature] = {};
                    }
                    compatibilityData[depsInfo[i].feature][depsInfo[i].regularPlatformId] = JSON.parse(requiredData[i]);
                }
            } catch (e) {
                callback("Unable to parse data for " + depsInfo[i].originalPlatformId);
                return;
            }
            callback();
        }, function(e) {
            // this function could be called multiple times if multiple modules can't be loaded
            // ensure the callback is called only one time.
            if (!errorOccured) {
                errorOccured = true;
                callback(e.message);
            }
        });
    }

    function getRegularPlatformId(platformId) {
        var name, version, platform;
        platformId = platformId.split("_");
        name = platformId[0].toLowerCase();
        version = platformId[1];

        for (var i = availablePlatforms.length - 1; i >= 0; i--) {
            platform = availablePlatforms[i];
            if (name !== platform.name) {
                continue;
            }

            for (var j = 0; j < version.length && j < platform.version.length; j++) {
                if (version.charAt(j) === platform.version.charAt(j) ||
                    version.charAt(j).toLowerCase() === "x" ||
                    platform.version.charAt(j).toLowerCase() === "x") {
                    continue;
                }
                break;
            }

            if (j < version.length && j < platform.version.length) {
                continue;
            } else if (version.length === platform.version.length) {
                return platform.name + "_" + platform.version;
            } else if (j < version.length &&
                version.substring(j, version.length).toLowerCase() === ".x") {
                return platform.name + "_" + platform.version;
            } else if (j < platform.version.length &&
                platform.version.substring(j, platform.version.length).toLowerCase() === ".x") {
                return platform.name + "_" + platform.version;
            } else {
                continue;
            }
        }

        return null;
    }

    function getData(feature, platformId) {
        var regularPlatformId;
        try {
            feature = feature.toLowerCase();
            platformId = platformId.toLowerCase();
            regularPlatformId = platformIdMap[platformId];
            if (compatibilityData[feature] && compatibilityData[feature][regularPlatformId]) {
                return compatibilityData[feature][regularPlatformId];
            }
        } catch (e) {
            console.error("Unable to get compatibility data for feature '" +
                          feature + "', platform '" + platformId + "'");
        }
        return null;
    }

    function isDataAvailable(feature, platformId) {
        var regularPlatformId;
        try {
            feature = feature.toLowerCase();
            platformId = platformId.toLowerCase();
            regularPlatformId = platformIdMap[platformId];
            if (compatibilityData[feature] && compatibilityData[feature][regularPlatformId]) {
                return true;
            }
        } catch (e) {}
        return false;
    }

    return {
        init            : init,
        loadData        : loadData,
        getData         : getData,
        isDataAvailable : isDataAvailable
    };
});
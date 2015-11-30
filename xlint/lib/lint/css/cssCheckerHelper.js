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

    var cssProperties = JSON.parse(require('text!./cssProperties.json'));
    var knownValuesDetails = JSON.parse(require('text!./knownValues.json'));
    var cssValueParser = require('./css_value_parser/cssValueParser');
    var dataManager = require('../dataManager');

    // extend cssProperties
    (function(properties) {
        var i, j, length, name, prefix, _prefix;
        for (name in properties) {
            if (!properties.hasOwnProperty(name)) {
                continue;
            }
            if (properties[name].prefixes) {
                for (i = 0, length = properties[name].prefixes.length; i <length; i++) {
                    prefix = properties[name].prefixes[i];
                    if (!properties[prefix + name]) {
                        properties[prefix + name] = {
                            knownValues: properties[name].knownValues,
                            equivalents: [name]
                        };
                        for (j = 0; j < length; j++) {
                            _prefix = properties[name].prefixes[j];
                            if (_prefix !== prefix) {
                                properties[prefix + name].equivalents.push(_prefix + name);
                            }
                        }
                        if (properties[name].equivalents) {
                            properties[prefix + name].equivalents = properties[prefix + name].equivalents.concat(properties[name].equivalents);
                        }
                    }
                }
            }
        }
    })(cssProperties);

    /**
     * Get equivalent properties of a property
     * @param  {string} name - property name
     * @return {object} null or Array of equivalent properties
     */
    function getEquivalentProperties(name) {
        var result, i, length, prefixes, equivalents;
        if (!cssProperties[name]) {
            return null;
        }
        result = [];
        prefixes = cssProperties[name].prefixes;
        if (prefixes) {
            for (i = 0, length = prefixes.length; i < length; i++) {
                result.push(prefixes[i] + name);
            }
        }
        equivalents = cssProperties[name].equivalents;
        if (equivalents) {
            result = result.concat(equivalents);
        }

        return result;
    }

    /**
     * Check if a property is supported on the target platform.
     * @param  {string}  name
     * @param  {string}  targetPlatformId
     * @return {string/undefined} could be:
     *         "unknown"    : no data for this property
     *         "y"          : supported
     *         "n"          : not supported
     *         "m"          : may not be supported on some devices
     *         undefined    : supported
     */
    function getPropertyCompatibility(name, targetPlatformId) {
        var compatibilityData;
        compatibilityData = getData(targetPlatformId);
        if (!compatibilityData) {
            // the data should be ready before check
            throw "no compatibility data for " + targetPlatformId;
        }

        compatibilityData = compatibilityData["compatibility-data"];
        if (!compatibilityData[name]) {
            //WARN("No compatibility data for property '" + name + "'!!!");
            return "unknown";
        }

        // compatibilityStatus[name].supported could be
        // "y"       : supported
        // "n"       : not supported
        // "m"       : may not be supported on some devices
        // undefined : supported
        return compatibilityData[name].supported;
    }

    function isObservedProperty(name) {
        return cssProperties[name];
    }

    /**
     * Check if the value of the property is supported on the target platform.
     * @param  {string}  name - property name
     * @param  {string}  value - property value, the value could be a complex value for a shorthand property.
     * @param  {string}  targetPlatformId
     * @return {object}  {valueType1: "y"/"n"/"m"/undefined, valueType2: "y"/"n"/"m"/undefined, ...}
     */
    function getValueCompatibility(styleItem, targetPlatformId) {
        var result, compatibilityData;
        compatibilityData = getData(targetPlatformId);
        if (!compatibilityData) {
            // the data should be ready before check
            throw "no compatibility data for " + targetPlatformId;
        }

        result = {};
        compatibilityData = compatibilityData["compatibility-data"];

        if (styleItem.valueTypes) {
            styleItem.valueTypes.forEach(function(valueType) {
                result[valueType] = compatibilityData[styleItem.name][valueType];
            });
        }

        return result;
    }

    /*
     * The knownValues argument holds an array of value type, get all the value types that match the given value.
     * @param value       {String}     - css value
     * @param knownValues {Array}      - known value types
     * @return            null/{Array} - matched value types, if no matched value type, return null;
     */
    function getValueType(styleItem) {
        var valueTypes, matchedValueTypes;
        var value, knownValues;

        function findAllMatchedTypes(types) {
            var allMatchedTypes = [];
            types.forEach(function(typeInfo) {
                var matchedType = findMatchedType(typeInfo);
                if (matchedType) {
                    allMatchedTypes.push(matchedType);
                }
                if (typeInfo.type === 'FUNCTION') {
                    allMatchedTypes = allMatchedTypes.concat(findAllMatchedTypes(typeInfo.args));
                }
            });
            return allMatchedTypes;
        }

        function findMatchedType(typeInfo) {
            var knownValueInfo;
            for (var i = 0; i < knownValues.length; i++) {
                knownValueInfo = knownValuesDetails[knownValues[i]];

                if (!knownValueInfo) {
                    //ERROR("No description for CSS value type '" + knownValues[i] + "'");
                    continue;
                }

                if (knownValueInfo.type !== typeInfo.type) {
                    continue;
                }
                if (knownValueInfo.type === 'FUNCTION') {
                    if (knownValueInfo.name === typeInfo.name) {
                        return knownValues[i];
                    }
                } else if (knownValueInfo.type === 'IDENT') {
                    if (knownValueInfo.value === typeInfo.value) {
                        return knownValues[i];
                    }
                } else {
                    return knownValues[i];
                }
            }

            return null;
        }

        value = styleItem.value;
        knownValues = cssProperties[styleItem.name].knownValues;

        if (!knownValues) {
            return null;
        }

        try {
            valueTypes = cssValueParser.getValueTypes(value);
            matchedValueTypes = findAllMatchedTypes(valueTypes);
        } catch (e) {
            ERROR(e);
            return null;
        }

        return matchedValueTypes.length === 0 ? null : matchedValueTypes;
    }

    function getData(platformId) {
        return dataManager.getData('css', platformId);
    }

    function isDataAvailable(platformId) {
        return dataManager.isDataAvailable('css', platformId);
    }

    function ERROR(msg) {
        console.error(msg);
    }

    function WARN(msg) {
        console.warn(msg);
    }

    function NOTICE(msg) {
        console.log(msg);
    }

    return {
        getEquivalentProperties: getEquivalentProperties,
        getPropertyCompatibility: getPropertyCompatibility,
        getValueCompatibility: getValueCompatibility,
        isObservedProperty: isObservedProperty,
        getValueType: getValueType
    };

});
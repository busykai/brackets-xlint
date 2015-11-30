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

    var problemInfo = require('../problemInfo'),
        helper = require('./cssCheckerHelper');

    var problemType = problemInfo.problemType,
        problemLevel = problemInfo.problemLevel;

    var currentCssText, currentConfig;

    function init(config, callback) {
        currentConfig = config;
        callback();
    }

    /**
     * Check compatibility problems of a piece of css text
     * @param  {String} css    the css text
     * @return {Object}        problems 
     */
    function checkCss(css) {
        var cssObject,
            problems = [];

        try {
            cssObject = parseCSS(css);
            if (currentConfig.ignoreProperty instanceof Array &&
                currentConfig.ignoreProperty.length !== 0) {
                if (cssObject.ignoredPropsByXLint) {
                    cssObject.ignoredPropsByXLint =
                        cssObject.ignoredPropsByXLint.concat(currentConfig.ignoreProperty);
                } else {
                    cssObject.ignoredPropsByXLint = currentConfig.ignoreProperty;
                }
            }
            handleInlineXLintConfig(cssObject);
        } catch (e) {
            return { "problems": [e.problem] };
        }

        currentCssText = css;
        
        cssObject.cssRules.forEach(function(rule) {
            switch (typeOf(rule)) {
            case 'CSSImportRule':
                problems = problems.concat(checkCssImportRule(rule));
                break;
            case 'CSSStyleRule':
                problems = problems.concat(checkCssStyleRule(rule));
                break;
            case 'CSSKeyframesRule':
                problems = problems.concat(checkCssKeyframesRule(rule));
                break;
            case 'CSSMediaRule':
                problems = problems.concat(checkCssMediaRule(rule));
                break;
            case 'CSSFontFaceRule':
                problems = problems.concat(checkCssFontFaceRule(rule));
                break;
            default:
                // unrecognized rule
                break;
            }
        });

        return { "problems": problems };
    }

    function parseCSS(css) {
        var cssom = require('../thirdparty/CSSOM/CSSOM');
        
        try {
            return cssom.parse(css);
        } catch (e) {
            var position = 0, line = 1, column = 1, length = css.length, problem;
            // calculate position
            for (; position < length; position++) {
                if (css.charAt(position) === '\n') {
                    line++;
                    column = 1;
                } else {
                    column++;
                }
                if (line === e.line && column === e.char) {
                    break;
                }
            }
            problem = {
                'type': problemType.CSS_PARSE_ERROR,
                'level': problemLevel.ERROR,
                'reason': e.message,
                'evidence': css.charAt(position),
                'position': position,
                'line': line,
                'column': column,
                'influencedPlatforms': "all"
            };
            
            throw { "problem": problem };
        }
    }

    function handleInlineXLintConfig(cssObj) {
        function extendIgnoredProps(obj) {
            if (obj.cssRules &&
                (obj.ignoredPropsByXLint || obj.ignoreXLint !== undefined)) {
                obj.cssRules.forEach(function(rule) {
                    if (rule.ignoredPropsByXLint) {
                        rule.ignoredPropsByXLint = rule.ignoredPropsByXLint.concat(obj.ignoredPropsByXLint);
                    } else {
                        rule.ignoredPropsByXLint = obj.ignoredPropsByXLint;
                    }

                    if (rule.ignoreXLint === undefined &&
                        obj.ignoreXLint !== undefined) {
                        rule.ignoreXLint = obj.ignoreXLint;
                    }
                    extendIgnoredProps(rule);
                });
            }
        }

        extendIgnoredProps(cssObj);
    }

    /**
     * Rule-check function check every property of the rule.
     */
    function checkCssStyleRule(rule) {
        var style = rule.style,
            problems = [],
            targetPlatformIds = [],
            i, length, propertyGroups, propertyGroup;

        if (rule.ignoreXLint) {
            return problems;
        }
        currentConfig.targetPlatforms.forEach(function(platform) {
            targetPlatformIds.push(platform.platformId);
        });

        propertyGroups = groupStyles(style);

        targetPlatformIds.forEach(function(platformId) {
            var 
                // iterate on propertyGroups
                i,
                // length of propertyGroups
                lengthi,
                // iterate on items in a propertyGroup
                j,
                // length of propertyGroup
                lengthj,
                // when we found an item in a propertyGroup is supported on a platform,
                // it means the propertyGroup is supported.
                // iterate on items in the propertyGroup to remove platformId from the problems
                // attached to all items in the propertyGroup
                k,
                // item in a propertyGroup
                item,
                // property name of the item
                property,
                // propertyGroup
                propertyGroup,
                // indicate whether the property is problematci
                propertyProblemExists,
                // an item is a css property with one or more values
                // this count problematic values of an item, if all values are problematic
                // then this item is problematic. This is how we determine whether an item is
                // supported or not.
                problematicValueCount,
                // compatibility status of a property
                propertyStatus,
                // string of the name of the key whose value are problems attached to item
                problemKeyName;
            for (i = 0, lengthi = propertyGroups.length; i < lengthi; i++) {
                propertyGroup = propertyGroups[i];
                for (j = 0, lengthj = propertyGroup.length; j < lengthj; j++) {
                    item = propertyGroup[j];
                    property = item.name;

                    if (rule.ignoredPropsByXLint &&
                        rule.ignoredPropsByXLint.indexOf(property) !== -1) {
                        continue;
                    }

                    if (!helper.isObservedProperty(property)) {
                        continue;
                    }

                    propertyProblemExists = false;
                    propertyStatus = helper.getPropertyCompatibility(property, platformId);

                    // the property is not supported
                    if (propertyStatus === "n" || propertyStatus === "unknown") {
                        propertyProblemExists = true;
                        checkPropertyProblem(rule, style, item, platformId,
                            problemType.CSS_PROPERTY_NOT_SUPPORTED,
                            problemLevel.ERROR,
                            "Property \"" + item.name + "\" is not supported.");
                    }
                    // the property may not be supported on some devices
                    else if (propertyStatus === "m") {
                        propertyProblemExists = true;
                        checkPropertyProblem(rule, style, item, platformId,
                            problemType.CSS_PROPERTY_PARTIALLY_SUPPORTED,
                            problemLevel.ERROR,
                            "Property \"" + item.name + "\" may not be supported on some devices.");
                    }

                    // property is supported, check the value
                    problematicValueCount = checkValueProblem(rule, style, item, platformId);

                    // At least one property/value has no problem, so this item has no problem,
                    // so this group is valid, while we may already attached some problems
                    // to items before this item, remove platformId from influencedPlatforms of those problems
                    if (!propertyProblemExists && problematicValueCount !== style[property].length) {
                        for (k = 0; k <= j; k++) {
                            removePlatformFromItemProblems(propertyGroup[k], platformId);
                        }
                        break; // no need to check the other items of this group
                    }
                }
            }
        });

        problems = problems.concat(gatherProblems(propertyGroups));
        
        return problems;
    }

    function isInIgnoredRange(index, ranges) {
        var i, length, range;
        for (i = 0, length = ranges.length; i < length; i++) {
            range = ranges[i];
            if (index >= range.from && index <= range.to) {
                return true;
            }
        }
        return false;
    }

    function groupStyles(style) {
        var i, j, length, length1, property, equivalents, propertyGroup, propertyGroups, groupedProperties;

        propertyGroups = [];
        groupedProperties = [];
        for (i = 0, length = style.properties.length; i < length; i++) {
            if (groupedProperties.length === length) {
                break; // all properties are grouped
            }

            property = style.properties[i];
            if (groupedProperties.indexOf(property) !== -1) {
                continue;
            }
            groupedProperties.push(property);
            propertyGroup = [{name: property}];

            equivalents = helper.getEquivalentProperties(property);
            if (!equivalents) {
                propertyGroups.push(propertyGroup);
                continue;
            }

            for (j = 0, length1 = equivalents.length; j < length1; j++) {
                property = equivalents[j];
                if (style.hasOwnProperty(property)) {
                    groupedProperties.push(property);
                    propertyGroup.push({name: property});
                }
            }

            propertyGroups.push(propertyGroup);
        }
        return propertyGroups;
    }

    function removePlatformFromItemProblems(item, platformId) {
        var i, j, length, problem, styleIndex, valueType, problemKeyNames, problemKeyName;

        problemKeyNames = ["__problems_" + problemType.CSS_PROPERTY_NOT_SUPPORTED,
                           "__problems_" + problemType.CSS_PROPERTY_PARTIALLY_SUPPORTED];
        for (j = problemKeyNames.length - 1; j >= 0; j--) {
            problemKeyName = problemKeyNames[j];
            if (item[problemKeyName]) {
                for (i = 0, length = item[problemKeyName].length; i < length; i++) {
                    problem = item[problemKeyName][i];
                    if (problem.influencedPlatforms.indexOf(platformId) !== -1) {
                        problem.influencedPlatforms.splice(problem.influencedPlatforms.indexOf(platformId), 1);
                    }
                }
            }
        }

        problemKeyNames = ["__problems_" + problemType.CSS_VALUE_NOT_SUPPORTED,
                           "__problems_" + problemType.CSS_VALUE_PARTIALLY_SUPPORTED];
        for (j = problemKeyNames.length - 1; j >= 0; j--) {
            problemKeyName = problemKeyNames[j];
            if (item[problemKeyName]) {
                for (styleIndex in item[problemKeyName]) {
                    if (!item[problemKeyName].hasOwnProperty(styleIndex)) {
                        continue;
                    }
                    for (valueType in item[problemKeyName][styleIndex]) {
                        if (!item[problemKeyName][styleIndex].hasOwnProperty(valueType)) {
                            continue;
                        }
                        problem = item[problemKeyName][styleIndex][valueType];
                        if (problem.influencedPlatforms.indexOf(platformId) !== -1) {
                            problem.influencedPlatforms.splice(problem.influencedPlatforms.indexOf(platformId), 1);
                        }
                    }
                }
            }
        }
    }

    function gatherProblems(propertyGroups) {
        var i, j, k, m, lengthi, lengthj, lengthk, propertyGroup, item, styleIndex, valueType, problem, problems, problemKeyNames, problemKeyName;
        problems = [];
        for (i = 0, lengthi = propertyGroups.length; i < lengthi; i++) {
            propertyGroup = propertyGroups[i];
            for (j = 0, lengthj = propertyGroup.length; j < lengthj; j++) {
                item = propertyGroup[j];
                problemKeyNames = ["__problems_" + problemType.CSS_PROPERTY_NOT_SUPPORTED,
                                   "__problems_" + problemType.CSS_PROPERTY_PARTIALLY_SUPPORTED];
                for (m = problemKeyNames.length - 1; m >= 0; m--) {
                    problemKeyName = problemKeyNames[m];
                    if (item[problemKeyName]) {
                        for (k = 0, lengthk = item[problemKeyName].length; k < lengthk; k++) {
                            problem = item[problemKeyName][k];
                            if (problem.influencedPlatforms.length !== 0) {
                                problems.push(problem);
                            }
                        }
                    }
                }
                problemKeyNames = ["__problems_" + problemType.CSS_VALUE_NOT_SUPPORTED,
                                   "__problems_" + problemType.CSS_VALUE_PARTIALLY_SUPPORTED];
                for (m = problemKeyNames.length - 1; m >= 0; m--) {
                    problemKeyName = problemKeyNames[m];
                    if (item[problemKeyName]) {
                        for (styleIndex in item[problemKeyName]) {
                            if (!item[problemKeyName].hasOwnProperty(styleIndex)) {
                                continue;
                            }
                            for (valueType in item[problemKeyName][styleIndex]) {
                                if (!item[problemKeyName][styleIndex].hasOwnProperty(valueType)) {
                                    continue;
                                }
                                problem = item[problemKeyName][styleIndex][valueType];                            
                                if (problem.influencedPlatforms.length !== 0) {
                                    problems.push(problem);
                                }
                            }
                        }
                    }
                }
            }
        }
        return problems;
    }

    function checkPropertyProblem(rule, style, item, platformId, type, level, reason) {
        var i, length, property, styleItem, styleIndex, problemKeyName;
        property = item.name;
        problemKeyName = "__problems_" + type;
        if (item[problemKeyName]) {
            for (i = 0, length = item[problemKeyName].length; i < length; i++) {
                item[problemKeyName][i].influencedPlatforms.push(platformId);
            }
        } else {
            item[problemKeyName] = [];
            for (i = 0, length = style[property].length; i < length; i++) {
                styleIndex = style[property][i];

                if (rule.ignoredRangesByXLint &&
                    isInIgnoredRange(styleIndex, rule.ignoredRangesByXLint)) {
                    continue;
                }
                styleItem = style[styleIndex];
                if (!styleItem.__position) {
                    styleItem.__position = getPropertyPosition(rule, styleIndex) || {"index": null, "line": null, "column": null};
                }
                item[problemKeyName].push({
                    "type": type,
                    "level": level,
                    "reason": reason,
                    "evidence": getPropertyText(rule, styleIndex),
                    "line": styleItem.__position.line,
                    "column": styleItem.__position.column,
                    "position": styleItem.__position.index,
                    "influencedPlatforms": [platformId],
                    "info": {"property": styleItem.name, "value": styleItem.value}
                });
            }
        }
    }

    function checkValueProblem(rule, style, item, platformId) {
        var i, length, property, valueType, valueStatus, styleIndex, styleItem, problemExists, problemsCount;

        property = item.name;
        problemsCount = 0;
        for (i = 0, length = style[property].length; i < length; i++) {
            styleIndex = style[property][i];

            if (rule.ignoredRangesByXLint &&
                isInIgnoredRange(styleIndex, rule.ignoredRangesByXLint)) {
                continue;
            }

            styleItem = style[styleIndex];
            problemExists = false;

            if (styleItem.valueTypes === undefined) {
                styleItem.valueTypes = helper.getValueType(styleItem);
            }
            valueStatus = helper.getValueCompatibility(styleItem, platformId);
            for (valueType in valueStatus) {
                if (valueStatus.hasOwnProperty(valueType)) {
                    // only those values whose compatibility status is exactly "y" are recognized as supported.
                    // this means if the compatibility status is undefined, then it is recognized as unsupported.
                    // this kind of situation happens because of the vendor prefixed values. In the compatibility
                    // data, which is generated by the test application, for a specific target platform, there is
                    // only comptibility data for the vendor prefixed value whose prefix is only for that specific
                    // target platform. For example, in the compatibility data for android/4.0, there is only 
                    // compatibility data for -webkit- prefixed value, while no compatibility data for -moz- prefixed
                    // value.
                    if (valueStatus[valueType] === "y") { 
                        continue;
                    }
                    problemExists = true;
                    if (valueStatus[valueType] === undefined ||
                        valueStatus[valueType] === "n") {
                        checkValueProblemByValueType(rule, style, item, styleIndex,
                            valueType, platformId,
                            problemType.CSS_VALUE_NOT_SUPPORTED,
                            problemLevel.ERROR,
                            "Value \"" + styleItem.value + "\" is not supported.");
                    } else if (valueStatus[valueType] === "m") {
                        checkValueProblemByValueType(rule, style, item, styleIndex,
                            valueType, platformId,
                            problemType.CSS_VALUE_PARTIALLY_SUPPORTED,
                            problemLevel.ERROR,
                            "Value \"" + styleItem.value + "\" may not be supported on some devices.");
                    }
                }
            }
            if (problemExists) {
                problemsCount++;
            }
        }
        return problemsCount;
    }

    function checkValueProblemByValueType(rule, style, item, styleIndex, valueType, platformId, type, level, reason) {
        var problemKeyName, styleItem;
        styleItem = style[styleIndex];
        problemKeyName = "__problems_" + type;
        if (!item[problemKeyName]) {
            item[problemKeyName] = {};
        }
        if (!item[problemKeyName][styleIndex]) {
            item[problemKeyName][styleIndex] = {};
        }                        
        if (!styleItem.__position) {
            styleItem.__position = getPropertyPosition(rule, styleIndex) || {"index": null, "line": null, "column": null};
        }
        if (item[problemKeyName][styleIndex][valueType]) {
            item[problemKeyName][styleIndex][valueType].influencedPlatforms.push(platformId);
        } else {
            item[problemKeyName][styleIndex][valueType] = {
                "type": type,
                "level": level,
                "reason": reason,
                "evidence": getPropertyText(rule, styleIndex),
                "line": styleItem.__position.line,
                "column": styleItem.__position.column,
                "position": styleItem.__position.index,
                "influencedPlatforms": [platformId],
                "info": {"property": styleItem.name, "value": styleItem.value}
            };
        }
    }

    function checkCssImportRule(rule) {
        return [];
    }

    function checkCssKeyframesRule(rule) {
        var keyframeRules, problems;

        if (rule.ignoreXLint) {
            return [];
        }

        keyframeRules = rule.cssRules || [];
        problems = [];
            
        keyframeRules.forEach(function(keyframeRule) {
            if (!keyframeRule.style) {
                return;
            }
            
            // keyframeRule is almost the same with styleRule.
            // Only one difference: keyframeRule has keyText property while styleRule has selectorText property.
            // This doesn't matter in checkCssStyleRule.
            problems = problems.concat(checkCssStyleRule(keyframeRule));
        });
        
        return problems;
    }

    function checkCssMediaRule(rule) {
        var styleRules, problems;

        if (rule.ignoreXLint) {
            return [];
        }

        styleRules = rule.cssRules || [];
        problems = [];
        styleRules.forEach(function(styleRule) {
            if (!styleRule.style) {
                return;
            }
            problems = problems.concat(checkCssStyleRule(styleRule));
        });
        
        return problems;
    }

    function checkCssFontFaceRule(rule) {
        return [];
    }

    function getPropertyPosition(rule, index) {
        var position = rule.style[index].__starts,
            lines, line, column;

        if (!position || position < 0 ||
            index < 0 || // no such property
            !currentCssText) {
            return null;
        }

        lines = currentCssText.substring(0, position).split('\n');
        line = lines.length;
        column = lines.pop().length + 1;
        return {'index': position, 'line': line, 'column': column};
    }

    function getPropertyText(rule, index) {
        var starts = rule.style[index].__starts,
            ends = rule.style[index].__ends;
        
        return currentCssText.substring(starts, ends + 1);
    }

    function typeOf(obj) {
        var type = Object.prototype.toString.apply(obj);
        type = type.substring(8, type.length - 1);
        if (type === 'Object') {
            return obj.constructor.name;
        }
        return type;
    }

    function trimQuotes(str) {
        return str.replace(/^["']+|["']+$/g, '');
    }

    function trimVendorPrefix(str) {
        return str.replace(/^-o-|^-webkit-|^-moz-|^-ms-/, '');
    }

    return {
        init: init,
        checkCss: checkCss
    };

});
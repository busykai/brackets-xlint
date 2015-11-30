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

    var HTMLParser          = require("../thirdparty/htmlparser/htmlparser"),
        sprintf             = require("../thirdparty/sprintf/sprintf").sprintf,
        problemInfo         = require('../problemInfo'),
        compatibilityHelper = require("./htmlCheckerHelper");

    var problemType         = problemInfo.problemType,
        problemLevel        = problemInfo.problemLevel,
        htmlParser,
        checkHTMLCallback;

    var HTMLNodeType = {
        Text    : 'text',
        Tag     : 'tag',
        Attr    : 'attr',
        CData   : 'cdata',
        Doctype : 'doctype',
        Comment : 'comment'
    };

    var ERRORMSG = {
        tagNotSupported   : "Tag \"%(name)s\" is not supported.",
        attrNotSupported  : "Attribute \"%(name)s\" is not supported.",
        valueNotSupported : "Value \"%(value)s\" for attribute \"%(name)s\" is not supported."
    };

    var configuration, targetPlatformIds;
    var traverseDOMHooks = [], traverseDOMHookNames = [];

    // user defined configuration
    var ConfigDirective = {
        ignoreHTMLTag     : "xlint.ignoretag",
        ignoreHTMLAttr    : "xlint.ignoreattr",
        ignoreHTMLValue   : "xlint.ignorevalue",
        ignoreMediaFormat : "xlint.ignoremedia"
    };

    function init(config, callback) {
        configuration = config;
        targetPlatformIds = [];
        configuration.targetPlatforms.forEach(function(platform) {
            targetPlatformIds.push(platform.platformId);
        });
        setupHTMLParser();
        callback();
    }

    function setupHTMLParser() {
        var handler = new HTMLParser.HtmlBuilder(function(err, dom) {
            if (err) {
                checkHTMLCallback({ problems: [composeParseErrorProblem(err)] });
                return;
            }
            parseDOM(dom, function(problems) {
                checkHTMLCallback({ problems: problems});
            });
        }, {
            includeLocation: true,
            enforceEmptyTags: true,
            ignoreWhitespace: true
        });
        htmlParser = new HTMLParser.Parser(handler);
    }

    function checkHTML(html, cb) {
        checkHTMLCallback = cb;
        htmlParser.parseComplete(html);
    }

    function parseDOM(dom, cb) {
        var problems = [], inlineConfig;

        for (var i = 0, length = dom.length; i < length; i++) {
            traverse(dom[i], getConfiguration(dom, configuration));
        }

        cb(problems);

        function traverse(node, config) {
            var tmpProblems;
            if (!node.name || isIgnoredTag(node.name, config)) {
                return;
            }
            tmpProblems = checkTag(node, targetPlatformIds, config);
            if (tmpProblems.length > 0) {
                problems = problems.concat(tmpProblems);
            }

            tmpProblems = runTraverseDOMHooks(node, config);
            if (tmpProblems.length > 0) {
                problems = problems.concat(tmpProblems);
            }

            if (node.children) {
                var _config = getConfiguration(node.children, config);
                for (var i = 0, length = node.children.length; i < length; i++) {
                    if (_config.ignoreHTMLTagByIndex.indexOf(i) !== -1) { continue; }
                    traverse(node.children[i], _config);
                }
            }
        }
    }

    function getConfiguration(nodes, parentConfig) {
        var config = {
            ignoreHTMLTag     : parentConfig.ignoreHTMLTag || [],
            ignoreHTMLAttr    : parentConfig.ignoreHTMLAttr || [],
            ignoreHTMLValue   : parentConfig.ignoreHTMLValue || [],
            ignoreMediaFormat : parentConfig.ignoreMediaFormat || []
        };
        var inlineConfig = getInlineConfiguration(nodes);
        return {
            ignoreHTMLTag        : config.ignoreHTMLTag.concat(inlineConfig.ignoreHTMLTag),
            ignoreHTMLAttr       : config.ignoreHTMLAttr.concat(inlineConfig.ignoreHTMLAttr),
            ignoreHTMLValue      : config.ignoreHTMLValue.concat(inlineConfig.ignoreHTMLValue),
            ignoreMediaFormat    : config.ignoreMediaFormat.concat(inlineConfig.ignoreMediaFormat),
            ignoreHTMLTagByIndex : inlineConfig.ignoreHTMLTagByIndex
        };
    }

    function getInlineConfiguration(nodes) {
        var ignoredHTMLTags        = [],
            ignoredHTMLAttrs       = [],
            ignoredHTMLValues      = [],
            ignoredMediaFormats    = [],
            ignoredHTMLTagsIndices = [],
            config;

        for (var i = 0, length = nodes.length; i < length; i++) {
            if (nodes[i].type === "comment") {
                config                 = parseInlineConfiguration(nodes[i].data, i);
                ignoredHTMLTags        = ignoredHTMLTags.concat(config.ignoreHTMLTag);
                ignoredHTMLAttrs       = ignoredHTMLAttrs.concat(config.ignoreHTMLAttr);
                ignoredHTMLValues      = ignoredHTMLValues.concat(config.ignoreHTMLValue);
                ignoredMediaFormats    = ignoredMediaFormats.concat(config.ignoreMediaFormat);
                ignoredHTMLTagsIndices = ignoredHTMLTagsIndices.concat(config.ignoreHTMLTagByIndex);
            }
        }
        return {
            ignoreHTMLTag        : ignoredHTMLTags,
            ignoreHTMLAttr       : ignoredHTMLAttrs,
            ignoreHTMLValue      : ignoredHTMLValues,
            ignoreMediaFormat    : ignoredMediaFormats,
            ignoreHTMLTagByIndex : ignoredHTMLTagsIndices
        };
    }

    function parseInlineConfiguration(content, index) {
        var ignoredHTMLTags        = [],
            ignoredHTMLAttrs       = [],
            ignoredHTMLValues      = [],
            ignoredMediaFormats    = [],
            ignoredHTMLTagsIndices = [],
            directives;

        directives = content.trim().toLowerCase().split(';');
        directives.forEach(function(directive) {
            var params, // the params of a directive
                param,  // single param, in case of ignoreHTMLAttr and ignoreHTMLValue it's like tag/attr/value
                i, j, length;
            directive = directive.trim();
            if (directive.indexOf(ConfigDirective.ignoreHTMLTag) === 0) {
                params = directive.substr(ConfigDirective.ignoreHTMLTag.length).trim().split(',').filter(function(elem) {
                    return !!elem.trim();
                });
                for (i = params.length - 1; i >= 0; i--) {
                    if (/^\d+$/.test(params[i])) {
                        for (j = 1, length = parseInt(params[i]); j <= length; j++) {
                            if (ignoredHTMLTagsIndices.indexOf(index + j) === -1) {
                                ignoredHTMLTagsIndices.push(index + j);
                            }
                        }
                    } else if (ignoredHTMLTags.indexOf(params[i]) === -1) {
                        ignoredHTMLTags.push(params[i]);
                    }
                }
            } else if (directive.indexOf(ConfigDirective.ignoreHTMLAttr) === 0) {
                params = directive.substr(ConfigDirective.ignoreHTMLAttr.length).trim().split(',').filter(function(elem) {
                    return !!elem;
                });
                for (i = params.length - 1; i >= 0; i--) {
                    param = params[i].split('/');
                    if (param.length === 2) {
                        ignoredHTMLAttrs.push({
                            tag: param[0],
                            attr: param[1]
                        });
                    }
                }
            } else if (directive.indexOf(ConfigDirective.ignoreHTMLValue) === 0) {
                params = directive.substr(ConfigDirective.ignoreHTMLValue.length).trim().split(',').filter(function(elem) {
                    return !!elem;
                });
                for (i = params.length - 1; i >= 0; i--) {
                    param = params[i].split('/');
                    if (param.length === 3 && param[0] && param[1] && param[2]) {
                        ignoredHTMLValues.push({
                            tag: param[0],
                            attr: param[1],
                            value: param[2]
                        });
                    }
                }
            } else if (directive.indexOf(ConfigDirective.ignoreMediaFormat) === 0) {
                params = directive.substr(ConfigDirective.ignoreMediaFormat.length).trim().split(',').filter(function(elem) {
                    return !!elem;
                });
                ignoredMediaFormats = ignoredMediaFormats.concat(params);
            }
        });

        return {
            ignoreHTMLTag        : ignoredHTMLTags,
            ignoreHTMLAttr       : ignoredHTMLAttrs,
            ignoreHTMLValue      : ignoredHTMLValues,
            ignoreMediaFormat    : ignoredMediaFormats,
            ignoreHTMLTagByIndex : ignoredHTMLTagsIndices
        };
    }

    function isIgnoredTag(name, config) {
        var ignoredTags = config.ignoreHTMLTag;
        for (var i = ignoredTags.length - 1; i >= 0; i--) {
            if (ignoredTags[i].toLowerCase() === name.toLowerCase()) {
                return true;
            }
        }
        return false;
    }

    function isIgnoredAttr(tag, attr, config) {
        var ignoredAttrs = config.ignoreHTMLAttr;
        for (var i = ignoredAttrs.length - 1; i >= 0; i--) {
            if (ignoredAttrs[i].tag.toLowerCase() === tag.toLowerCase() &&
                ignoredAttrs[i].attr.toLowerCase() === attr.toLowerCase()) {
                return true;
            }
        }
        return false;
    }

    function isIgnoredValue(tag, attr, value, config) {
        var ignoredValues = config.ignoreHTMLValue;
        for (var i = ignoredValues.length - 1; i >= 0; i--) {
            if (ignoredValues[i].tag.toLowerCase() === tag.toLowerCase() &&
                ignoredValues[i].attr.toLowerCase() === attr.toLowerCase() &&
                ignoredValues[i].value.toLowerCase() === value.toLowerCase()) {
                return true;
            }
        }
        return false;
    }

    function checkTag(node, targetPlatformIds, config) {
        var problems = [];
        if (node.type !== HTMLNodeType.Tag) { return problems; }

        var tagUnsupportedPlatformIds = [];
        var attrUnsupportedProblems = {};
        var valueUnsupportedProblems = {};

        targetPlatformIds.forEach(function(platformId) {
            var compatibility, type;

            type = problemType.HTML_TAG_NOT_SUPPORTED;
            compatibility = compatibilityHelper.getTagCompatibility(platformId, node.name);
            if (compatibility === "n") {
                // the tag is not supported
                if (tagUnsupportedPlatformIds) {
                    tagUnsupportedPlatformIds.push(platformId);
                } else {
                    tagUnsupportedPlatformIds = [platformId];
                }
            } else if (compatibility === "y" || compatibility === undefined || compatibility === "unknown") {
                // the tag is supported, check its attributes
                if (!node.attributes) {
                    return;
                }
                for (var attr in node.attributes) {
                    if (!node.attributes.hasOwnProperty(attr)) { continue; }
                    if (isIgnoredAttr(node.name, attr, config)) { continue; }
                    compatibility = checkAttribute(node, attr, platformId);
                    if (!compatibility.attrSupported) {
                        if (attrUnsupportedProblems[attr]) {
                            attrUnsupportedProblems[attr].push(platformId);
                        } else {
                            attrUnsupportedProblems[attr] = [platformId];
                        }
                        continue;
                    }
                    if (!isIgnoredValue(node.name, attr, node.attributes[attr], config) &&
                        !compatibility.valueSupported) {
                        if (valueUnsupportedProblems[attr]) {
                            valueUnsupportedProblems[attr].platformIds.push(platformId);
                        } else {
                            valueUnsupportedProblems[attr] = {
                                platformIds: [platformId],
                                value: node.attributes[attr]
                            };
                        }
                    }
                }
            }
        });

        if (tagUnsupportedPlatformIds.length > 0) {
            problems.push({
                type: problemType.HTML_TAG_NOT_SUPPORTED,
                level: problemLevel.ERROR,
                reason: sprintf(ERRORMSG.tagNotSupported, {name: node.name}),
                evidence: node.name,
                context: node.raw,
                position: -1,
                line: node.location.line,
                column: node.location.col,
                influencedPlatforms: tagUnsupportedPlatformIds
            });
        }

        var attr;
        for (attr in attrUnsupportedProblems) {
            if (!attrUnsupportedProblems.hasOwnProperty(attr)) { continue; }
            problems.push({
                type: problemType.HTML_ATTR_NOT_SUPPORTED,
                level: problemLevel.ERROR,
                reason: sprintf(ERRORMSG.attrNotSupported, {name: attr}),
                evidence: attr,
                context: node.raw,
                position: -1,
                line: node.location.line,
                column: node.location.col,
                influencedPlatforms: attrUnsupportedProblems[attr]
            });
        }

        for (attr in valueUnsupportedProblems) {
            if (!valueUnsupportedProblems.hasOwnProperty(attr)) { continue; }
            problems.push({
                type: problemType.HTML_VALUE_NOT_SUPPORTED,
                level: problemLevel.ERROR,
                reason: sprintf(ERRORMSG.valueNotSupported, {name: attr, value: valueUnsupportedProblems[attr].value}),
                evidence: valueUnsupportedProblems[attr].value,
                context: node.raw,
                position: -1,
                line: node.location.line,
                column: node.location.col,
                influencedPlatforms: valueUnsupportedProblems[attr].platformIds
            });
        }

        return problems;
    }

    function checkAttribute(node, attr, platformId) {
        var result = {
            attrSupported  : true,
            valueSupported : true
        },
        compatibility = compatibilityHelper.getAttributeCompatibility(platformId, node.name, attr);
        if (compatibility === "n") {
            // the attribute is not supported
            result.attrSupported = false;
        } else if (compatibility === "y" || compatibility === undefined) {
            // the attribute is supported, check its value
            if (!node.attributes[attr]) {
                return result;
            }
            compatibility = compatibilityHelper.getValueCompatibility(platformId, node.name, attr, node.attributes[attr]);
            if (compatibility === "n") {
                result.valueSupported = false;
            }
        }

        return result;
    }

    function composeParseErrorProblem(reason) {
        return {
            'type': problemType.HTML_PARSE_ERROR,
            'level': problemLevel.ERROR,
            'reason': reason,
            'evidence': null,
            'position': -1,
            'line': -1,
            'column': -1,
            'influencedPlatforms': "all"
        };
    }

    function runTraverseDOMHooks(node, config) {
        var problems = [], tmpProblems;
        for (var i = traverseDOMHooks.length - 1; i >= 0; i--) {
            tmpProblems = traverseDOMHooks[i].check(node, config);
            if (tmpProblems && tmpProblems.length > 0) {
                problems = problems.concat(tmpProblems);
            }
        }
        return problems;
    }

    function registerTraverseDOMHook(hook) {
        if (!hook || !hook.name || !hook.check || typeof hook.check !== "function") {
            return false;
        }
        if (traverseDOMHookNames.indexOf(hook.name) >= 0) {
            return false;
        }
        traverseDOMHookNames.unshift(hook.name);
        traverseDOMHooks.unshift(hook);
        return true;
    }

    function unregisterTraverseDOMHook(name) {
        traverseDOMHookNames.splice(traverseDOMHookNames.indexOf(name), 1);
        for (var i = traverseDOMHooks.length - 1; i >= 0; i--) {
            if (name === traverseDOMHooks[i].name) {
                traverseDOMHooks.splice(i, 1);
            }
        }
    }

    return {
        HTMLNodeType              : HTMLNodeType,
        init                      : init,
        checkHTML                 : checkHTML,
        registerTraverseDOMHook   : registerTraverseDOMHook,
        unregisterTraverseDOMHook : unregisterTraverseDOMHook
    };
});
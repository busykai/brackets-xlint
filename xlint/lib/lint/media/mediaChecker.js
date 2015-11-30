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

    var sprintf             = require("../thirdparty/sprintf/sprintf").sprintf,
        pathutils           = require("../thirdparty/path-utils/path-utils"),
        MediaType           = require("../thirdparty/content-type/content-type"),
        problemInfo         = require('../problemInfo'),
        htmlChecker         = require("../html/htmlChecker"),
        mediaCheckerHelper  = require("./mediaCheckerHelper"),
        ext2mediatype       = JSON.parse(require("text!./ext2mediatype.json"));

    var problemType         = problemInfo.problemType,
        problemLevel        = problemInfo.problemLevel;

    var ERRORMSG = {
        formatNotSupported   : "Media type \"%(name)s\" is not supported."
    };

    var configuration, targetPlatformIds;

    function init(config, callback) {
        configuration = config;
        targetPlatformIds = [];
        configuration.targetPlatforms.forEach(function(platform) {
            targetPlatformIds.push(platform.platformId);
        });
        registerHTMLHook();
        callback();
    }

    function registerHTMLHook() {
        htmlChecker.registerTraverseDOMHook({
            name  : "media",
            check : checkEmbededContent
        });
    }

    function checkEmbededContent(node, config) {
        var problems = [];

        switch(node.name) {
        case "object":
            problems = problems.concat(checkObjectNode(node, config));
            break;
        case "embed":
            problems = problems.concat(checkEmbedNode(node, config));
            break;
        case "video":
            problems = problems.concat(checkVideoNode(node, config));
            break;
        case "audio":
            problems = problems.concat(checkAudioNode(node, config));
            break;
        case "img":
            problems = problems.concat(checkImgNode(node, config));
            break;
        }

        return problems;
    }

    function checkObjectNode(node, config) {
        var problems = [], problem;
        var objElem = parseObjectNode(node);
        var mediaType, filenameExt;
        if (!objElem.data && !objElem.type) {
            // invalid object element at least one of either the data
            // attribute or the type attribute must be present
            return problems;
        }

        // user can configure to ignore checking files with some specific extension names
        filenameExt = pathutils.parseUrl(objElem.data).filenameExtension.substr(1);
        if (isIgnoredFileExtension(filenameExt, config)) {
            return problems;
        }

        if (objElem.type) {
            mediaType = new MediaType(objElem.type);
            if (isObservedMediaType(mediaType.type)) {
                mediaType = mediaType.type;
            } else {
                return problems;
            }
        }

        if (!mediaType && objElem.data) {
            mediaType = ext2mediatype[filenameExt];
        }

        if (!mediaType) {
            // can NOT get media type
            return problems;
        }

        problem = checkMediaTypeCompat(mediaType, node);
        if (problem) {
            problems.push(problem);
        }

        return problems;
    }

    function checkEmbedNode(node, config) {
        var problems = [], problem;
        var objElem = parseEmbedNode(node);
        var mediaType, filenameExt;
        if (!objElem.src && !objElem.type) {
            // invalid object element at least one of either the src
            // attribute or the type attribute must be present
            return problems;
        }

        filenameExt = pathutils.parseUrl(objElem.src).filenameExtension.substr(1);
        if (isIgnoredFileExtension(filenameExt, config)) {
            return problems;
        }

        if (objElem.type) {
            mediaType = new MediaType(objElem.type);
            if (isObservedMediaType(mediaType.type)) {
                mediaType = mediaType.type;
            } else {
                return problems;
            }
        }

        if (!mediaType && objElem.src) {
            mediaType = ext2mediatype[filenameExt];
        }

        if (!mediaType) {
            // can NOT get media type
            return problems;
        }

        problem = checkMediaTypeCompat(mediaType, node);
        if (problem) {
            problems.push(problem);
        }

        return problems;
    }
    
    function checkVideoNode(node, config) {
        var problems = [], problem, tmpProblems;
        var objElem = parseVideoNode(node);
        var mediaType, filenameExt;

        if (objElem.src) {
            filenameExt = pathutils.parseUrl(objElem.src).filenameExtension.substr(1);
            if (isIgnoredFileExtension(filenameExt, config)) {
                return problems;
            }
            mediaType = ext2mediatype[filenameExt];
        } else if (objElem.sources && objElem.sources.length > 0) {
            tmpProblems = checkSourceElements(objElem, config);
            if (tmpProblems) {
                problems = problems.concat(tmpProblems);
            }
            return problems;
        }

        if (!mediaType) {
            // can NOT get media type
            return problems;
        }

        problem = checkMediaTypeCompat(mediaType, node);
        if (problem) {
            problems.push(problem);
        }

        return problems;
    }

    function checkAudioNode(node, config) {
        var problems = [], problem, tmpProblems;
        var objElem = parseAudioNode(node);
        var mediaType, filenameExt;

        if (objElem.src) {
            filenameExt = pathutils.parseUrl(objElem.src).filenameExtension.substr(1);
            if (isIgnoredFileExtension(filenameExt, config)) {
                return problems;
            }
            mediaType = ext2mediatype[filenameExt];
        } else if (objElem.sources && objElem.sources.length > 0) {
            tmpProblems = checkSourceElements(objElem, config);
            if (tmpProblems) {
                problems = problems.concat(tmpProblems);
            }
            return problems;
        }

        if (!mediaType) {
            // can NOT get media type
            return problems;
        }

        problem = checkMediaTypeCompat(mediaType, node);
        if (problem) {
            problems.push(problem);
        }

        return problems;
    }

    function checkSourceElements(elem, config) {
        var problems = [];
        var ignore = false;
        elem.sources.forEach(function(source) {
            var mediaType, problem, filenameExt;
            if (ignore) {
                return;
            }

            filenameExt = pathutils.parseUrl(source.src).filenameExtension.substr(1);
            if (isIgnoredFileExtension(filenameExt, config)) {
                ignore = true;
                return;
            }
            if (source.type) {
                mediaType = new MediaType(source.type);
                if (isObservedMediaType(mediaType.type)) {
                    mediaType = mediaType.type;
                } else {
                    return;
                }
            } else if (source.src) {
                mediaType = ext2mediatype[filenameExt];
            }

            if (!mediaType) {
                return;
            }
            problem = checkMediaTypeCompat(mediaType, source._node);
            if (problem) {
                problems.push(problem);
            }
        });

        if (ignore) {
            return null;
        }

        if (problems.length < elem.sources.length) {
            return null;
        }

        var nonProblematicPlatformIds = [], i, j, index;
        // as long as there is one media source being supported on a platform,
        // then there is no problem on the platform
        for (i = targetPlatformIds.length - 1; i >= 0; i--) {
            for (j = problems.length - 1; j >= 0; j--) {
                if (problems[j].influencedPlatforms.indexOf(targetPlatformIds[i]) < 0) {
                    nonProblematicPlatformIds.push(targetPlatformIds[i]);
                }
            }
        }

        // remove the non-problematic platform IDs from influenced platforms
        for (i = nonProblematicPlatformIds.length - 1; i >= 0; i--) {
            for (j = problems.length - 1; j >= 0; j--) {
                index = problems[j].influencedPlatforms.indexOf(nonProblematicPlatformIds[i]);
                if (index >= 0) {
                    problems[j].influencedPlatforms.splice(index, 1);
                }
            }
        }

        // if there is no influenced platforms, remove the problem
        for (i = problems.length - 1; i >= 0; i--) {
            if (problems[i].influencedPlatforms.length === 0) {
                problems.splice(i, 1);
            }
        }

        if (problems.length === 0) {
            return null;
        }

        return problems;
    }

    function checkImgNode(node, config) {
        var problems = [], problem;
        var mediaType, filenameExt;

        if (!node.attributes || !node.attributes.src) {
            return problems;
        }

        filenameExt = pathutils.parseUrl(node.attributes.src).filenameExtension.substr(1);
        if (isIgnoredFileExtension(filenameExt, config)) {
            return problems;
        }

        mediaType = ext2mediatype[filenameExt];
        if (!mediaType) {
            return problems;
        }

        problem = checkMediaTypeCompat(mediaType, node);
        if (problem) {
            problems.push(problem);
        }

        return problems;
    }

    function checkMediaTypeCompat(type, node) {
        var unsupportedPlatformIds = [];
        targetPlatformIds.forEach(function(platformId) {
            var compatibility = mediaCheckerHelper.getCompatibility(platformId, type);
            if (compatibility === "n") {
                unsupportedPlatformIds.push(platformId);
            }
        });
        if (unsupportedPlatformIds.length > 0) {            
            return {
                type                : problemType.MEDIA_FORMAT_NOT_SUPPORTED,
                level               : problemLevel.ERROR,
                reason              : sprintf(ERRORMSG.formatNotSupported, {name: type}),
                evidence            : node.raw,
                context             : node.raw,
                position            : -1,
                line                : node.location.line,
                column              : node.location.col,
                influencedPlatforms : unsupportedPlatformIds
            };
        }

        return null;
    }
    
    // refer to http://www.w3.org/TR/html5/embedded-content-0.html#the-object-element
    function parseObjectNode(node) {
        var result = {};
        if (node.attributes) {
            result.data = node.attributes.data;
            result.type = node.attributes.type;
        }
        
        return result;
    }

    // refer to http://www.w3.org/TR/html5/embedded-content-0.html#the-embed-element
    function parseEmbedNode(node) {
        var result = {};
        if (node.attributes) {
            result.src = node.attributes.src;
            result.type = node.attributes.type;
        }
        return result;
    }

    // refer to http://www.w3.org/TR/html5/embedded-content-0.html#the-audio-element
    function parseAudioNode(node) {
        var result = {};

        if (node.attributes && node.attributes.src) {
            result.src = node.attributes.src;
        } else if (node.children) {
            result.sources = [];
            node.children.forEach(function(childNode) {
                var sourceNode;
                if (childNode.type === htmlChecker.HTMLNodeType.Tag && childNode.name.toLowerCase() === 'source') {
                    sourceNode = parseSourceNode(childNode);
                    if (sourceNode) {
                        result.sources.push(sourceNode);
                    }
                }
            });
        }
        return result;
    }

    // refer to http://www.w3.org/TR/html5/embedded-content-0.html#the-video-element
    function parseVideoNode(node) {
        var result = {};

        if (node.attributes && node.attributes.src) {
            result.src = node.attributes.src;
        } else if (node.children) {
            result.sources = [];
            node.children.forEach(function(childNode) {
                var sourceNode;
                if (childNode.type === htmlChecker.HTMLNodeType.Tag && childNode.name.toLowerCase() === 'source') {
                    sourceNode = parseSourceNode(childNode);
                    if (sourceNode) {
                        result.sources.push(sourceNode);
                    }
                }
            });
        }
        return result;
    }

    // refer to http://www.w3.org/TR/html5/embedded-content-0.html#the-source-element
    function parseSourceNode(node) {
        var result = {_node: node};
        if (!node.attributes) {
            return null;
        }
        
        result.src = node.attributes.src;
        result.type = node.attributes.type; // maybe undefined
        return result;
    }

    function isObservedMediaType(type) {
        for (var i in ext2mediatype) {
            if (type === ext2mediatype[i]) {
                return true;
            }
        }
        return false;
    }

    function isIgnoredFileExtension(ext, config) {
        var ignoredExts = config.ignoreMediaFormat || [];
        for (var i = ignoredExts.length - 1; i >= 0; i--) {
            if (ignoredExts[i].toLowerCase() === ext.toLowerCase()) {
                return true;
            }
        }
        return false;
    }

    return {init: init};
});
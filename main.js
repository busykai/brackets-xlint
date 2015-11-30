/*
 * Copyright 2013-2015 Intel Corporation.
 * 
 * See the file LICENSE for copying permission.
 */

/* jshint devel:true */
/* global define, $, brackets */

/**
 * Provides XLint results via the core linting extension point
 */
define(function (require, exports, module) {
    "use strict";

    // Load dependent modules
    var AppInit            = brackets.getModule("utils/AppInit"),
        CodeInspection     = brackets.getModule("language/CodeInspection"),
        Strings            = brackets.getModule("strings"),
        ProjectManager     = brackets.getModule("project/ProjectManager"),
        FileSystem         = brackets.getModule("filesystem/FileSystem"),
        DocumentManager    = brackets.getModule("document/DocumentManager"),
        ExtensionUtils     = brackets.getModule("utils/ExtensionUtils");

    
    // XLint
    var XLint               = require("xlint/xlint"),
        configFileName      = ".xlintrc",
        configured          = false;

    var defaultConfig = {
            targetPlatforms: [
                "android-2.3",
                "android-4.0",
                "android-4.1",
                "android-4.2",
                "android-4.3",
                "ios-6",
                "ios-7",
                "winph-8.0"
            ]
        },
        configInfo = {
            currentConfig: null
        };

    var ERROR_MSG = {
        project_root_not_found  : "Can NOT get project root entry",
        xlint_no_config_file    : "No available .xlintrc file for the project",
        xlint_bad_config        : {
            invalid_target_platforms    : "targetPlatforms must be an array",
            invalid_target_platform     : "a target platform must be a string",
            invalid_ignore_platforms    : "ignorePlatforms must be an array",
            invalid_ignore_platform     : "a ignored platform must be a string",
            invalid_ignore_html_tag     : "ignoreHTMLTag option must be a array of strings",
            invalid_ignore_html_attr    : "ignoreHTMLAttr option must be a array of objects with 'tag' and 'attr' properties",
            invalid_ignore_html_value   : "ignoreHTMLValue option must be a array of objects with 'tag', 'attr' and 'value' properties",
            invalid_ignore_media_format : "ignoreMediaFormat option must be a array of strings"
        }
    };

    var DEBUG = false;
    
 
    /**
     * Run XLint on the current document. Reports results to the main UI. Displays
     * a gold star when no errors are found.
     */
    function lintCSSFileAsync(text, fullPath) {
        var response = new $.Deferred();

        if (DEBUG) {
            console.log("XLint: lintOneFileAsync");
        }

        if (!configured) {
            loadXLint(function(err) {
                if (err) {
                    configured = false;
                    response.resolve({
                        errors: [
                            {
                                pos: {line: -1, ch: -1},
                                message: err,
                                type: CodeInspection.Type.WARNING
                            }
                        ]
                    });
                } else {                
                    configured = true;
                    response.resolve(checkCSS(text, fullPath));
                }
            });
        } else {
            response.resolve(checkCSS(text, fullPath));
        }

        return response.promise();
    }

    function lintHTMLFileAsync(text, fullPath) {
        var response = new $.Deferred();

        if (DEBUG) {
            console.log("XLint: lintOneFileAsync");
        }

        if (!configured) {
            loadXLint(function(err) {
                if (err) {
                    configured = false;
                    response.resolve({
                        errors: [
                            {
                                pos: {line: -1, ch: -1},
                                message: err,
                                type: CodeInspection.Type.WARNING
                            }
                        ]
                    });
                } else {                
                    configured = true;
                    checkHTML(text, fullPath, function(result) {
                        response.resolve(result);
                    });
                }
            });
        } else {            
            checkHTML(text, fullPath, function(result) {
                response.resolve(result);
            });
        }

        return response.promise();
    }

    function checkCSS(text, fullPath) {
        var startTime, endTime, duration;
        
        if (DEBUG) {
            startTime = (new Date()).getTime();
        }
        
        // If a line contains only whitespace, remove the whitespace
        // This should be doable with a regexp: text.replace(/\r[\x20|\t]+\r/g, "\r\r");,
        // but that doesn't work.
        var i, arr = text.split("\n");
        for (i = 0; i < arr.length; i++) {
            if (!arr[i].match(/\S/)) {
                arr[i] = "";
            }
        }
        text = arr.join("\n");
        
        var xlintResult = XLint.checkCss(text);
        if (DEBUG) {
            console.log(xlintResult);
        }

        var errors = formatProblems(xlintResult.problems);
        
        if (DEBUG) {
            endTime = (new Date()).getTime();
            duration = endTime- startTime;
            console.log("Duration: " + duration + "ms");
        }
        return {errors: errors};
    }

    function checkHTML(text, fullPath, cb) {
        var startTime, endTime, duration;
        
        if (DEBUG) {
            startTime = (new Date()).getTime();
        }
        
        // If a line contains only whitespace, remove the whitespace
        // This should be doable with a regexp: text.replace(/\r[\x20|\t]+\r/g, "\r\r");,
        // but that doesn't work.
        var i, arr = text.split("\n");
        for (i = 0; i < arr.length; i++) {
            if (!arr[i].match(/\S/)) {
                arr[i] = "";
            }
        }
        text = arr.join("\n");
        
        XLint.checkHTML(text, function(result) {
            if (DEBUG) {
                console.log(result);
            }

            var errors = formatProblems(result.problems);
            
            if (DEBUG) {
                endTime = (new Date()).getTime();
                duration = endTime- startTime;
                console.log("Duration: " + duration + "ms");
            }
            cb({errors: errors});
        });
    }

    /**
     * Loads project-wide XLint configuration.
     * XLint configuration file should be located at <Porject Root>/.xlintrc. It
     * is loaded each time project is changed or the configuration file is
     * modified.
     * 
     */
    function loadConfigFile(callback) {
        var projectRootEntry = ProjectManager.getProjectRoot(),
            configFile;

        if (!projectRootEntry) {
            callback(ERROR_MSG.project_root_not_found);
            return;
        }
        configFile = FileSystem.getFileForPath(projectRootEntry.fullPath + configFileName);
        configFile.read(function(err, data) {
            var config, configErrMsg;
            if (err) {
                // no available .xlintrc file
                if (DEBUG) {
                    console.log(ERROR_MSG.xlint_no_config_file);
                }
                data = JSON.stringify(defaultConfig);
            }

            try {
                config = JSON.parse(data);
                configErrMsg = validateConfiguration(config);
                if (configErrMsg) {
                    configErrMsg = "Invalid configuration, check your .xlintrc file: " + configErrMsg;
                }
            } catch(e) {
                configErrMsg = "Invalid configuration, check your .xlintrc file: " + e.message;
                if (DEBUG) {
                    console.dir(e);
                }
            }

            callback(configErrMsg, config);
        });
    }

    /**
     * Validate the config in the .xlintrc file
     * 
     * @param  {Object} config XLint's config got from .xlintrc file
     * @return {null/String} if it is valid config, return null, otherwise return err msg.
     */
    function validateConfiguration(config) {
        var indicesOfIgnoredPlatforms, targetPlatforms, i, j, length;
        if (config.targetPlatforms === undefined) {
            config.targetPlatforms = JSON.parse(JSON.stringify(defaultConfig.targetPlatforms));
        }
        if (!Array.isArray(config.targetPlatforms)) {
            return ERROR_MSG.xlint_bad_config.invalid_target_platforms;
        }

        if (config.targetPlatforms.length === 0) {
            return null;
        } else {
            for (i = config.targetPlatforms.length - 1; i >= 0; i--) {
                if (typeof config.targetPlatforms[i] !== "string") {
                    return ERROR_MSG.xlint_bad_config.invalid_target_platform;
                }
                config.targetPlatforms[i] = config.targetPlatforms[i].toLowerCase();
            }
        }

        if (config.ignorePlatforms) {
            if (!Array.isArray(config.ignorePlatforms)) {
                return ERROR_MSG.xlint_bad_config.invalid_ignore_platforms;
            } else {
                for (i = config.ignorePlatforms.length - 1; i >= 0; i--) {
                    if (typeof config.ignorePlatforms[i] !== "string") {
                        return ERROR_MSG.xlint_bad_config.invalid_ignore_platform;
                    }
                }
            }

            //remove ignored platforms from target platforms
            indicesOfIgnoredPlatforms = [];
            config.ignorePlatforms = config.ignorePlatforms.map(function(p) {
                return p.replace(/\*/g, "").toLowerCase();
            });
            for (i = config.targetPlatforms.length - 1; i >= 0; i--) {
                for (j = config.ignorePlatforms.length - 1; j >= 0; j--) {
                    if (config.targetPlatforms[i].indexOf(config.ignorePlatforms[j]) !== -1) {
                        indicesOfIgnoredPlatforms.push(i);
                        break;
                    }
                }
            }
            for (i = 0, length = indicesOfIgnoredPlatforms.length; i < length; i++) {
                config.targetPlatforms.splice(indicesOfIgnoredPlatforms[i], 1);
            }
        }

        targetPlatforms = [];
        for (i = 0, length = config.targetPlatforms.length; i < length; i++) {
            targetPlatforms.push({
                platformId: config.targetPlatforms[i].replace("-", "_")
            });
        }
        config.targetPlatforms = targetPlatforms;

        // check ignoreHTMLTag
        if (config.ignoreHTMLTag) {
            if (!Array.isArray(config.ignoreHTMLTag)) {
                return ERROR_MSG.xlint_bad_config.invalid_ignore_html_tag;
            }
            for (i = config.ignoreHTMLTag.length - 1; i >= 0; i--) {
                if (typeof config.ignoreHTMLTag[i] !== "string") {
                    return ERROR_MSG.xlint_bad_config.invalid_ignore_html_tag;
                }
            }
        }

        // check ignoreHTMLAttr
        if (config.ignoreHTMLAttr) {
            if (!Array.isArray(config.ignoreHTMLAttr)) {
                return ERROR_MSG.xlint_bad_config.invalid_ignore_html_attr;
            }
            for (i = config.ignoreHTMLAttr.length - 1; i >= 0; i--) {
                if (!config.ignoreHTMLAttr[i].tag ||
                    !config.ignoreHTMLAttr[i].attr) {
                    return ERROR_MSG.xlint_bad_config.invalid_ignore_html_attr;
                }
            }
        }

        // check ignoreHTMLValue
        if (config.ignoreHTMLValue) {
            if (!Array.isArray(config.ignoreHTMLValue)) {
                return ERROR_MSG.xlint_bad_config.invalid_ignore_html_value;
            }
            for (i = config.ignoreHTMLValue.length - 1; i >= 0; i--) {
                if (!config.ignoreHTMLValue[i].tag ||
                    !config.ignoreHTMLValue[i].attr ||
                    !config.ignoreHTMLValue[i].value) {
                    return ERROR_MSG.xlint_bad_config.invalid_ignore_html_value;
                }
            }
        }

        // check ignoreMediaFormat
        if (config.ignoreMediaFormat) {
            if (!Array.isArray(config.ignoreMediaFormat)) {
                return ERROR_MSG.xlint_bad_config.invalid_ignore_html_tag;
            }
            for (i = config.ignoreMediaFormat.length - 1; i >= 0; i--) {
                if (typeof config.ignoreMediaFormat[i] !== "string") {
                    return ERROR_MSG.xlint_bad_config.invalid_ignore_media_format;
                }
            }
        }
        return null;
    }

    /**
     * Method to load XLint, loadConfigFile is called to read the .xlintrc file's content.
     * If no .xlintrc file or .xlintrc file's content is not valid, then use the default config.
     * XLint.init is then called to load compatibility data.
     * 
     * @param  {Function} callback One argument - error message
     */
    function loadXLint(callback) {
        loadConfigFile(function(err, config) {
            if (DEBUG) {
                console.log("XLint: loadConfigFile callback");
            }

            if (err) {
                // invalid config in .xlintrc file
                callback(err);
                return;
            }
            
            if (configInfo.currentConfig === config ||
                JSON.stringify(configInfo.currentConfig) === JSON.stringify(config)) {
                if (DEBUG) {
                    console.log("XLint: the same config");
                }
                callback(null);
                return;
            }

            // load compatibility data
            XLint.init(config, function(err){
                if (DEBUG) {
                    console.log("XLint: XLint.init callback");
                }
                if (err) {
                    callback(err);
                    return;
                }
                configInfo.currentConfig = config;
                callback(null);
            });
        });
    }

    // handler for event documentSaved.xlint documentRefreshed.xlint projectOpen.xlint
    function handleConfigFileChange() {
        configured = false;
    }
    
    // format error messages
    function formatProblems(problems) {
        var errors = [];
        if (problems.length > 0) {
            problems.forEach(function(problem) {
                var message, htmlMessage, platforms = [];
                if (problem.influencedPlatforms === "all") {
                    message = problem.reason;
                } else {
                    problem.influencedPlatforms.forEach(function(platformId) {
                        // platformId is like "android_4.0", here it will be changed to "Android/4.0".
                        platformId = platformId.toLowerCase().split('_');
                        if (!platforms[platformId[0]]) {
                            platforms[platformId[0]] = {
                                iconHTML: "<span class='xlint-output-icon " + platformId[0] + "'></span>",
                                versions: []
                            };
                        }
                        platforms[platformId[0]].versions.push(platformId[1]);
                    });

                    message = "";
                    htmlMessage = "";
                    for (var p in platforms) {
                        if (!platforms.hasOwnProperty(p)) {
                            continue;
                        }
                        message += p + "(" + platforms[p].versions.join(",") + ") ";
                        htmlMessage += platforms[p].iconHTML + "(" + platforms[p].versions.join(",") + ") ";
                    }
                    message = problem.reason + " " + message;
                    htmlMessage = problem.reason + " " + htmlMessage;
                }
                errors.push({
                    pos: {line: problem.line - 1, ch: problem.column - 1},
                    message: message,
                    htmlMessage: htmlMessage,
                    type: CodeInspection.Type.WARNING
                });
            });
        }
        return errors;
    }

    // Register for CSS files
    CodeInspection.register("css", {
        name: "XLint",
        scanFileAsync: lintCSSFileAsync
    });

    // Register for HTML files
    CodeInspection.register("html", {
        name: "XLint",
        scanFileAsync: lintHTMLFileAsync
    });

    
    AppInit.appReady(function() {
        ExtensionUtils.loadStyleSheet(module, "styles.css");

        $(DocumentManager).on("documentSaved.xlint documentRefreshed.xlint", function(e, document) {
            if (document.file.fullPath === ProjectManager.getProjectRoot().fullPath + configFileName) {
                if (DEBUG) {
                    console.log("XLint: .xlintrc file saved/refreshed.");
                }
                handleConfigFileChange();
            }
        });
    });
});

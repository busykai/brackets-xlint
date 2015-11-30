/*
 * Copyright 2013-2015 Intel Corporation.
 * 
 * See the file LICENSE for copying permission.
 */
var define;
if (typeof define !== 'function') {
    define = require('amdefine')(module);
}

define(function() {
    "use strict";

    var problemType = {
        "CSS_PARSE_ERROR": 0, // ERROR when parse the css text using CSSOM
        "CSS_PROPERTY_NOT_SUPPORTED": 1,
        "CSS_VALUE_NOT_SUPPORTED": 2,
        "CSS_PROPERTY_PARTIALLY_SUPPORTED": 3,
        "CSS_VALUE_PARTIALLY_SUPPORTED": 4,
        "HTML_PARSE_ERROR": 20,
        "HTML_TAG_NOT_SUPPORTED": 21,
        "HTML_ATTR_NOT_SUPPORTED": 22,
        "HTML_VALUE_NOT_SUPPORTED": 23,
        "MEDIA_FORMAT_NOT_SUPPORTED": 40
    };

    var problemCategory = {
        'CSS': 1,
        'HTML': 2,
        'JS': 3,
        'MULTIMEDIA': 4
    };

    var problemLevel = {
        'ADVICE': 0,
        'WARNING': 1,
        'ERROR': 2
    };

    return {
        problemType: problemType,
        problemLevel: problemLevel
    };

});

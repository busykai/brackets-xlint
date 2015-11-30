/*
 * Copyright 2013-2015 Intel Corporation.
 * 
 * See the file LICENSE for copying permission.
 */
module.exports = function(grunt) {
    "use strict";
    
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        meta: {
            src: [
                'xlint.js',
                'build.js',
                'bin/*.js',
                'lib/**/*.js',
                '!lib/lint/thirdparty/**',
                '!lib/lint/css/css_value_parser/cssValueLexer.js'
            ],
            test: [
                'test/build.js'
            ],
            grunt: [
                'Gruntfile.js'
            ]
        },
        jshint: {
            files: [
                '<%= meta.src %>',
                '<%= meta.test %>',
                '<%= meta.grunt %>'
            ],
            options: {
                jshintrc: '.jshintrc'
            }
        },
        copy: {
            dist: {
                files: [
                    {expand: true, src: ['lib/lint/**', 'xlint.js'], dest: 'dist/'}
                ]
            }
        },
        shell: {
            generateCSSValueLexer: {
                command: "node node_modules/jison-lex/cli.js " +
                         "lib/lint/css/css_value_parser/cssValueParser.lex " +
                         "-o lib/lint/css/css_value_parser/cssValueLexer.js"
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('wrapCSSValueLexer', function() {
        var filePath = 'lib/lint/css/css_value_parser/cssValueLexer.js';
        var content = grunt.file.read(filePath);
        grunt.file.write(filePath, wrapAsAMDModule(content, 'cssValueLexer'));
    });
    grunt.registerTask('wrapCSSOM', function() {
        var filePath = 'lib/lint/thirdparty/CSSOM/CSSOM.js';
        var content = grunt.file.read(filePath);
        grunt.file.write(filePath, wrapAsAMDModule(content, 'CSSOM'));
    });

    grunt.registerTask('default', ['jshint']);
    grunt.registerTask('dist', ['copy:dist']);
    grunt.registerTask('build', ['shell:generateCSSValueLexer', 'wrapCSSValueLexer']);

    function wrapAsAMDModule(content, retValue) {
        var copyright = "/**\n" +
                        " * Copyright 2013 - 2013 Intel Corporation All Rights Reserved.\n" +
                        " *\n" +
                        " * The source code, information and material (\"Material\") contained herein is owned by Intel Corporation or its\n" +
                        " * suppliers or licensors, and title to such Material remains with Intel Corporation or its suppliers or\n" +
                        " * licensors. The Material contains proprietary information of Intel or its suppliers and licensors. The\n" +
                        " * Material is protected by worldwide copyright laws and treaty provisions. No part of the Material may be used,\n" +
                        " * copied, reproduced, modified, published, uploaded, posted, transmitted, distributed or disclosed in any way\n" +
                        " * without Intel's prior express written permission. No license under any patent, copyright or other intellectual\n" +
                        " * property rights in the Material is granted to or conferred upon you, either expressly, by implication,\n" +
                        " * inducement, estoppel or otherwise. Any license under such intellectual property rights must be express and\n" +
                        " * approved by Intel in writing.\n" +
                        " *\n" +
                        " * Unless otherwise agreed by Intel in writing, you may not remove or alter this notice or any other notice\n" +
                        " * embedded in Materials by Intel or Intel's suppliers or licensors in any way.\n" +
                        " */\n";
        return  copyright +
                "if (typeof define !== 'function') {\n" +
                "    var define = require('amdefine')(module);\n" +
                "}\n" +
                "define(function(require) {\n" + content + "\n" +
                "return " + retValue + ";\n});";
    }
};
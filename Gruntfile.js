/*
 * Copyright 2013-2015 Intel Corporation.
 * 
 * See the file LICENSE for copying permission.
 */
/* jshint node:true */
module.exports = function(grunt) {
    "use strict";
    
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        meta: {
            src: [
                'main.js'
            ],
            grunt: [
                'Gruntfile.js'
            ]
        },
        jshint: {
            files: [
                '<%= meta.src %>',
                '<%= meta.grunt %>'
            ],
            options: {
                jshintrc: '.jshintrc'
            }
        },
        copy: {
            main: {
                files: [
                    {expand: true, src: ['main.js', 'styles.css', 'img/*'], dest: 'dist/'}
                ]
            },
            xlint_dist: {
                files: [
                    {expand: true, cwd: 'xlint/dist', src: ['**'], dest: 'dist/xlint/'}
                ]
            }
        },
        compress: {
            dist: {
                options: {
                    archive: '<%= pkg.name %>-<%= pkg.version %>.zip',
                    mode: 'zip'
                },
                files: [
                    {cwd: 'dist', src: '**', dest: '<%= pkg.name %>'}
                ]
            }
        },
        shell: {
            xlint_dist: {
                command: "cd xlint && grunt dist && cd .."
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-shell');

    // remove devDependencies from package.json
    grunt.registerTask('package.json', function() {
        var package_json = grunt.file.readJSON('package.json');
        delete package_json.devDependencies;
        grunt.file.write('dist/package.json', JSON.stringify(package_json));
    });

    grunt.registerTask('default', ['jshint']);
    grunt.registerTask('dist', ['shell:xlint_dist', 'copy', 'package.json', 'compress']);
};
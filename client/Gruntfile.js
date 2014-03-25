module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            css: {
                src: [
                    '*.css'
                ],
                dest: 'dist/symple.css'
            },
            js: {
                src: [
                    '*.js'
                ],
                dest: 'dist/symple.js'
            }
        },
        cssmin: {
            css: {
                src: 'dist/symple.css',
                dest: 'dist/symple.min.css'
            }
        },
        uglify: {
            js: {
                files: {
                    'dist/symple.min.js': ['dist/symple.js']
                }
            }
        },
        watch: {
          files: ['*'],
          tasks: ['concat', 'cssmin', 'uglify']
       }
    });
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.registerTask('default', ['concat:css', 'cssmin:css', 'concat:js', 'uglify:js']);
};
module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
              separator: ';\n',
            },
            js: {
                src: [
                    'src/symple.js',
                    'src/symple.client.js'
                ],
                dest: 'dist/symple.js'
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
          tasks: ['concat', 'uglify']
       }
    });
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.registerTask('default', ['concat:js', 'uglify:js']);
};

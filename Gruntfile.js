module.exports = function(grunt) {

    grunt.initConfig({
      connect: {
        server: {
          options: {
            base: 'www',
            hostname: 'localhost',
            port: 9001,
            keepalive: true,
            open: true
          }
        }
      },

      shell: {
        generateReport: {
            options: {
                stdout: true
            },
            command: 'node lib/run.js'
        }
      }

    });

    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-contrib-connect');

    grunt.registerTask('default', ['shell:generateReport', 'connect']);
};
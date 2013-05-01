module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
			},
			build: {
				src: 'src/<%= pkg.name %>.js',
				dest: 'build/<%= pkg.name %>.min.js'
			}
		},
		cafemocha: {
			tests: {
				src: 'test/**/*.js',
				require: [
					'should'
				]
			}
		}
	});

	// Load the plugin that provides the "uglify" task.
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-cafe-mocha');

	// Default task(s).
	grunt.registerTask('default', ['cafemocha', 'uglify']);
	grunt.registerTask('uglify', ['uglify']);
};

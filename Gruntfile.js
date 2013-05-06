"use strict";

module.exports = function(grunt) {
	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
			},
			build: {
				src: 'lib/<%= pkg.name %>.js',
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
		},
		crisp: {
			build: {
				files: [{
					expand: true,
					cwd: 'src/',
					src: '**/*.crisp',
					dest: 'lib/',
					ext: '.js'
				}]
			}
		},
		copy: {
			build: {
				files: [{
					expand: true,
					cwd: 'src/',
					src: '**/*.js',
					dest: 'lib/'
				}]
			},
			approve: {
				files: [{
					expand: true,
					cwd: 'lib/',
					src: '**/*.js',
					dest: 'previous/'
				}]
			}
		},
		clean: {
			build: ["lib/"]
		}
	});

	// Load plugins.
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-cafe-mocha');
	grunt.loadNpmTasks('grunt-beautify');

	grunt.registerMultiTask('crisp', "Compile crisp files to JavaScript", function () {
		var compiler = require('./previous/compiler');

		grunt.log.writeln("Compiling crisps:");

		this.files.forEach(function (file) {
			if (file.src.length !== 1) {
				grunt.fatal("More than one source file found. don't know why." + file.src);
			}

			var src = file.src[0],
				dest = file.dest;

			grunt.log.writeln("\tCompiling", src, "to", dest);
			compiler.compile_io(src, dest);
		});
	});

	// Default task(s).
	grunt.registerTask('default', ['clean:build', 'copy:build', 'crisp', 'cafemocha']);
	grunt.registerTask('approve', ['copy:approve']);
};

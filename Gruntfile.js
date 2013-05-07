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
			options: {
				reporter: "dot"
			},
			tests: {
				src: 'test/**/*.js',
			}
		},
		crisp: {
			build: {
				files: [{
					expand: true,
					cwd: 'src/',
					src: ['**/*.crisp'],
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
			build: ["lib/"],
			approve: ["previous/"]
		}
	});

	// Load plugins.
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-cafe-mocha');
	grunt.loadNpmTasks('grunt-beautify');

	grunt.registerMultiTask('crisp', "Compile crisp files to JavaScript", function () {
		var compiler = require('./previous/compiler'),
			base_environment = require('./previous/baseenv').base_environment,
			env = base_environment.extend();

		grunt.log.writeln("Compiling crisps:");
		this.files.forEach(function (file) {
			if (file.src.length !== 1) {
				grunt.fatal("More than one source file found. don't know why." + file.src);
			}

			var src = file.src[0],
				dest = file.dest;

			try {
				grunt.log.write("\tCompiling", src, "to", dest);
				compiler.compile_io(src, dest, env);
				grunt.log.writeln("\t...Done.");
			} catch (e) {
				grunt.fail.fatal(e);
			}
		});
	});

	// Default task(s).
	grunt.registerTask('compile', ['clean:build', 'copy:build', 'crisp']);
	grunt.registerTask('test', ['cafemocha']);
	grunt.registerTask('default', ['compile', 'test']);
	grunt.registerTask('approve', ['clean:approve', 'copy:approve']);
};

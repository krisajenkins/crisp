"use strict";

module.exports = function (grunt) {
	// Project configuration.
	grunt.option('stack', true);
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		browserify: {
			'build/browser.js': ['build/compiler.js']
		},
		'closure-compiler': {
			build: {
				closurePath: '/Users/kris/Work/Sketches/crisp/',
				js: 'build/browser.js',
				jsOutputFile: 'build/browser.min.js',
				maxBuffer: 500,
				options: {
					compilation_level: 'ADVANCED_OPTIMIZATIONS',
					language_in: 'ECMASCRIPT5_STRICT'
				}
			}
		},
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
			},
			build: {
				src: 'build/browser.js',
				dest: 'build/browser.min.js'
			}
		},
		cafemocha: {
			options: {
				reporter: "dot"
			},
			tests: {
				src: ['test/**/*.js'],
			}
		},
		crisp: {
			build: {
				files: [{
					expand: true,
					cwd: 'src/',
					src: ['**/*.crisp'],
					dest: 'build/',
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
					dest: 'build/'
				}]
			},
			approve: {
				files: [{
					expand: true,
					cwd: 'build/',
					src: '**/*.js',
					dest: 'lib/'
				}]
			}
		},
		clean: {
			build: ["build/"],
			approve: ["lib/"]
		}
	});

	// Load plugins.
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-cafe-mocha');
	grunt.loadNpmTasks('grunt-beautify');
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-closure-compiler');

	grunt.registerMultiTask('crisp', "Compile crisp files to JavaScript", function () {
		var compiler = require('./lib/compiler'),
		crisp = require('./lib/crisp'),
		env = compiler.create_env();

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
	grunt.registerTask('approve', ['clean:approve', 'copy:approve', 'default']);
	grunt.registerTask('test', ['cafemocha']);
	grunt.registerTask('default', ['compile', 'test']);
};

"use strict";

var vm = require('vm');
var escodegen = require('escodegen');
var util = require('util');
var repl = require('repl');

var compiler = require('./compiler');

var make_eval = function () {
	var env = compiler.create_env();

	return function (command, context, filename, callback) {
		var tree, compiled, result;

		try {
			// Node wraps the command in brackets, which is not a Lisp-friendly thing to do.
			command = command.slice(1,-1);

			tree = compiler.compile_string(command, env);
			compiled = escodegen.generate(tree);

			result = vm.runInNewContext(compiled, env);

			callback(null, result);
		} catch (e) {
			console.log("COMMAND", command);
			console.log("TREE", util.inspect(tree, {depth: null}));
			console.log("COMPILED", compiled);
			callback(null, e);
		}
	};
};

var start_repl = function () {
	var session = repl.start({
		writer: function (x) {
			return util.inspect(x, {depth: null});
		},
		prompt: "=> ",
		eval: make_eval(),
		terminal: false,
		useColors: true,
		useGlobal: false,
	});

	return session;
};
exports.start_repl = start_repl;

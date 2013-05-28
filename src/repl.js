"use strict";

var vm			= require('vm');
var escodegen	= require('escodegen');
var util		= require('util');
var repl		= require('repl');

var compiler	= require('./compiler');
var reader		= require('./reader');

var make_eval = function () {
	var env = compiler.create_env();

	return function (string, context, filename, callback) {
		var tree, compiled, result;
		context.command = context.command || "";

		// Node wraps the command in brackets, which is not a Lisp-friendly thing to do.
		context.command += string.slice(1, -1);

		try {
			tree = compiler.compile_string(context.command, env);
			compiled = escodegen.generate(tree);

			result = vm.runInNewContext(compiled, env);

			context.command = "";
			callback(null, result);
		} catch (e) {
			if (e.type === "UnbalancedForm") {
				callback(null, undefined);
				return;
			}

			callback(null, e);
		}
	};
};

var start_repl = function () {
	return repl.start({
		prompt: "=> ",
		eval: make_eval(),
		terminal: false,
		ignoreUndefined: true,
		useColors: true,
		useGlobal: false,
	});
};
exports.start_repl = start_repl;

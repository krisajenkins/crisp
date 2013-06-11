"use strict";

var vm			= require('vm');
var util		= require('util');
var escodegen	= require('escodegen');
var assert		= require('assert');

var crisp		= require('../build/crisp');
var compiler	= require('../build/compiler');

var assertEq = function (result, expected, message) {
	if (message === undefined) {
		message = "Not equal:";
	}

	assert.equal(
		true,
		crisp.types.equal(result, expected),
		crisp.core.format(
			"%s %s %s",
			message,
			crisp.core.inspect(result, {depth: null}),
			crisp.core.inspect(expected, {depth: null})
		)
	);
};
exports.assertEq = assertEq;

var runIn = function (source, debug, env) {
	var compiled, compiled_ast, result;

	compiled_ast = compiler.compile_string(source, env);

	if (debug) {
		console.log("\n==== COMPILED ====");
		console.log(util.inspect(compiled_ast, {depth: null}));
		console.log("====\n");
	}

	compiled = escodegen.generate(compiled_ast);

	if (debug) {
		console.log(compiled);
		console.log("====\n");
	}

	try {
		result = vm.runInContext(compiled, env);
	} catch (e) {
		throw e;
	}

	return result;
};
exports.runIn = runIn;

var compilesTo = function (source, expected, env, message) {
	var result = runIn(source, false, env);
	assertEq(result, expected, message);
};
exports.compilesTo = compilesTo;

var kompilesTo = function (source, expected, env, message) {
	var result = runIn(source, true, env);
	assertEq(result, expected, message);
};
exports.kompilesTo = kompilesTo;

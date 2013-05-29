"use strict";

var assert		= require('assert');
var ast			= require('./ast');
var crisp		= require('./crisp');
var Symbol		= crisp.types.Symbol;
var count		= crisp.types.count;
var first		= crisp.types.first;
var second		= crisp.types.second;
var rest		= crisp.types.rest;

var primitives = {};

var make_binary_primitive = function (symbol_name) {
	var f = function (args, env) {
		switch (count(args)) {
		case 1: return first(args);
		case 2: return ast.encode.binary(symbol_name, first(args), second(args));
		default: return ast.encode.binary(symbol_name, first(args), f(rest(args)));
		}
	};

	primitives[new Symbol(symbol_name)] = f;
};

var make_comparison_primitive = function (symbol_name) {
	primitives[new Symbol(symbol_name)] = function (args, env) {
		assert.equal(2, count(args), symbol_name + " takes exactly two arguments. Got: " + count(args)); // TODO This should take 1+ args.
		return ast.encode.binary(
			symbol_name,
			first(args),
			second(args)
		);
	};
};

var make_logical_primitive = function (symbol_name, operator) {
	var f = function (args, env) {
		switch (count(args)) {
		case 1: return first(args);
		case 2: return ast.encode.logical(operator, first(args), second(args));
		default: return ast.encode.logical(operator, first(args), f(rest(args)));
		}
	};

	primitives[new Symbol(symbol_name)] = f;
};

make_binary_primitive("+");
make_binary_primitive("-");
make_binary_primitive("*");
make_binary_primitive("/");
make_binary_primitive("/");

make_logical_primitive("and", "&&");
make_logical_primitive("or", "||");
primitives[new Symbol("not")] = function (args, env) {
	assert.equal(1, count(args), "not takes exactly one argument. Got: " + count(args));
	return ast.encode.unary('!', first(args), true);
};

make_comparison_primitive("<");
make_comparison_primitive(">");
make_comparison_primitive("<=");
make_comparison_primitive(">=");

primitives[new Symbol("=")] = function (args, env) {
	assert.equal(2, count(args), "= takes exactly two arguments. Got: " + count(args)); // TODO This should take 1+ args.
	return ast.encode.call(
		ast.encode.member(
			ast.encode.member(
				ast.encode.identifier('crisp'),
				ast.encode.identifier('core')
			),
			ast.encode.identifier('equal')
		),
		[
			first(args),
			second(args)
		]
	);
};

primitives[new Symbol("instanceof")] = function (args, env) {
	assert.equal(2, count(args), "instanceof takes exactly two arguments. Got: " + count(args));
	return ast.encode.binary(
		'instanceof',
		first(args),
		second(args)
	);
};
primitives[new Symbol("typeof")] = function (args, env) {
	assert.equal(1, count(args), "typeof takes exactly one argument. Got: " + count(args));
	return ast.encode.unary('typeof', first(args), true);
};

primitives[new Symbol("aset")] = function (args, env) {
	assert.equal(2, count(args), "aset takes exactly two arguments. Got: " + count(args));
	return ast.encode.assignment(
		first(args),
		second(args)
	);
};

primitives[new Symbol("throw")] = function (args, env) {
	assert.equal(1, count(args), "throw takes exactly one arguments. Got: " + count(args));
	return ast.encode.throw(
		first(args)
	);
};

primitives[new Symbol("gensym")] = function (args, env) {
	assert.equal(true, count(args) < 2, "aset takes at most one argument. Got: " + count(args));
	var prefix;

	prefix = (count(args) === 1)
		? prefix = first(args)
		: ast.encode.literal("G_");

	if (env.gensym_index === undefined) {
		env.gensym_index = 0;
	}
	env.gensym_index = env.gensym_index + 1;

	return ast.encode.identifier(
		crisp.core.format("%s_%d", prefix.value, env.gensym_index)
	);
};
exports.primitives = primitives;

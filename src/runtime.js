/* jslint indent: 0 */
// START
"use strict";

var crisp	= require('./crisp');
var logger = require('tracer').console();
var assert = require("assert");

var is_self_evaluating = function (form) {
	return ((typeof form === "boolean") || (typeof form === "number") || (typeof form === "string"));
};

exports.is_self_evaluating = is_self_evaluating;

var identity = function (x) {
	return x;
};

exports.identity = identity;

var seq_equal = function (x, y) {
	if (crisp.types.seq(x) === undefined) {
		return crisp.types.seq(y) === undefined;
	}

	if (crisp.types.seq(y) === undefined) {
		return crisp.types.seq(x) === undefined;
	}

	return equal(crisp.types.first(x), crisp.types.first(y))
		&&
		equal(crisp.types.rest(x), crisp.types.rest(y));
};

var equal = function (x, y) {
	if (x === undefined) {
		return y === undefined;
	}

	if (y === undefined) {
		return x === undefined;
	}

	if (crisp.types.is_seq(x) && crisp.types.is_seq(y)) {
		return seq_equal(x, y);
	}

	return require('deep-equal')(x, y);
};

exports.equal = equal;

var assertEq = function (result, expected, message) {
	if (message === undefined) {
		message = "Not equal:";
	}

	assert.equal(
		true,
		equal(result, expected),
		crisp.core.format(
			"%s %s %s",
			message,
			crisp.core.inspect(result, {depth: null}),
			crisp.core.inspect(expected, {depth: null})
		)
	);
};
exports.assertEq = assertEq;

var Environment = function () {
	return;
};

Environment.prototype.extend = function () {
	var Parent = function () {
		return;
	};
	Parent.prototype = this;
	return new Parent();
};
Environment.prototype.extend_by = function (callee, args, rest, values) {
	var i, sub_env = this.extend();

	if (rest === undefined) {
		assert.equal(args.length, values.length, "Callee " + callee + " called with the wrong number of arguments, Expected " + args.length + ". Got " + values.length + ".");
	} else {
		assert.equal(true, args.length <= values.length, "Callee " + callee + " called with the wrong number of arguments, Expected " + args.length + "+. Got " + values.length + ".");
	}

	for (i = 0; i < args.length; i = i + 1) {
		sub_env[args[i]] = values[i];
	}
	if (rest !== undefined) {
		if (values.length > args.length) {
			sub_env[rest] = values.slice(args.length);
		}
	}

	return sub_env;
};

exports.Environment = Environment;

var apply = function (f, aseq) {
	var args = [],
		things = crisp.types.seq(aseq),
		result;

	while (things !== undefined) {
		args.push(crisp.types.first(things));
		things = crisp.types.seq(crisp.types.rest(things));
	}

	return f.apply(undefined, args);
};
exports.apply = apply;

// END

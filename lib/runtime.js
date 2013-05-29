/* jslint indent: 0 */
// START
"use strict";

var crisp	= require('./crisp');
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

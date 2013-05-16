/* jslint indent: 0 */
// START
"use strict";

var assert = require("assert");
var format = require("util").format;
var crisp = {
	types: require('./types')
};

var is_atom = function (form) {
	return !((form instanceof Array) || (form instanceof crisp.types.List) || (form instanceof crisp.types.Vector));
};

exports.is_atom = is_atom;

var is_self_evaluating = function (form) {
	return ((typeof form === "boolean") || (typeof form === "number") || (typeof form === "string"));
};

exports.is_self_evaluating = is_self_evaluating;

var identity = function (x) {
	return x;
};

exports.identity = identity;

var equal = function (x, y) {
	return (x === undefined) ? (y === undefined)
		: (y === undefined) ? false
		: x.equal ? x.equal(y)
		: y.equal ? y.equal(x)
		: (typeof x === typeof y) ? (x === y)
		: (function () { throw "Cannot determine equality for objects " + x + " and " + y; }());
};

exports.equal = equal;

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

var first = function (x) {
	return x.first();
};

// END

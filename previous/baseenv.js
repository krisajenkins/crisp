"use strict";

var Symbol = require('./types').Symbol;
var Keyword = require('./types').Keyword;
var Environment = require('./runtime').Environment;
var equal = require('./runtime').equal;

var base_environment = new Environment();
exports.base_environment = base_environment;
base_environment[new Symbol("nil")] = void(0);
base_environment[new Symbol("true")] = true;
base_environment[new Symbol("false")] = false;
base_environment[new Symbol("=")] = equal;
base_environment[new Symbol("typeof")] = function typeof_internal(arg) {
	return typeof arg;
};
base_environment[new Symbol("nil?")] = function is_nil(arg) {
	return typeof arg === "undefined";
};
base_environment[new Symbol("length")] = function length(arg) {
	return arg.length;
};
base_environment[new Symbol("not")] = function not_internal(arg) {
	return !arg;
};
base_environment[new Symbol("+")] = function plus() {
	var result = 0, i;
	for (i = 0; i < arguments.length; i = i + 1) {
		result += arguments[i];
	}
	return result;
};
base_environment[new Symbol("-")] = function minus(head) {
	if (typeof head === 'undefined') {
		return 0;
	}

	var result = head, i;

	for (i = 1; i < arguments.length; i = i + 1) {
		result -= arguments[i];
	}
	return result;
};
base_environment[new Symbol("*")] = function multiply(head) {
	if (typeof head === 'undefined') {
		return 0;
	}

	var result = head, i;

	for (i = 1; i < arguments.length; i = i + 1) {
		result *= arguments[i];
	}
	return result;
};
base_environment[new Symbol("/")] = function divide(head) {
	if (typeof head === 'undefined') {
		return 0;
	}

	var result = head, i;

	for (i = 1; i < arguments.length; i = i + 1) {
		result /= arguments[i];
	}
	return result;
};
base_environment[new Symbol("vec")] = function vec() {
	return arguments;
};

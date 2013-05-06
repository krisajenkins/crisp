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
base_environment[new Symbol("not")] = function (arg) {
	return ! arg;
};
base_environment[new Symbol("+")] = function () {
	var result = 0, i;
	for (i = 0; i < arguments.length; i++) {
		result += arguments[i];
	}
	return result;
};
base_environment[new Symbol("-")] = function (head) {
	if (typeof(head) === 'undefined') {
		return 0;
	}

	var result = head, i;

	for (i = 1; i < arguments.length; i++) {
		result -= arguments[i];
	}
	return result;
};
base_environment[new Symbol("*")] = function (head) {
	if (typeof(head) === 'undefined') {
		return 0;
	}

	var result = head, i;

	for (i = 1; i < arguments.length; i++) {
		result *= arguments[i];
	}
	return result;
};
base_environment[new Symbol("/")] = function (head) {
	if (typeof(head) === 'undefined') {
		return 0;
	}

	var result = head, i;

	for (i = 1; i < arguments.length; i++) {
		result /= arguments[i];
	}
	return result;
};
base_environment[new Symbol("vec")] = function () {
	return arguments;
};

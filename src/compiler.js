"use strict";

var assert = require('assert');
var Symbol = require('./runtime').Symbol;
var equal = require('./runtime').equal;
var read = require('./reader').read;

var is_atom = function (form) {
	return !(form instanceof Array);
};

var is_self_evaluating = function (form) {
	return typeof(form) === "number"
		||
		typeof(form) === "string";
};

var analyze = function (form) {
	console.log("FORM", form, typeof(form));
	if (is_atom(form)) {
		console.log("ATOM", form);
		if (is_self_evaluating(form)) {
			console.log("SELF", form);
			return function (env) {
				return form;
			};
		}
	} else {
		console.log("LIST", form);
		if (equal(form[0], new Symbol("quote"))) {
			assert.equal(form.length, 2, "Invalid quote form: " + form);
			return function (env) {
				return form[1];
			};
		}
	}

	throw "Unhandled form: " + form;
};

var base_environment = {};
var global_environment = {};
global_environment.prototype = base_environment;

var evaluate = function (string) {
	var form, analysis, result;

	form = read(string);
	console.log("FORM", form);
	analysis = analyze(form);
	console.log("ANALYSIS", analysis);
	result = analysis(global_environment);
	console.log("RESULT", result);

	return result;
};
exports.evaluate = evaluate;

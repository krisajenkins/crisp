"use strict";

var assert = require('assert');
var Symbol = require('./runtime').Symbol;
var Keyword = require('./runtime').Keyword;
var Environment = require('./runtime').Environment;
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

var analyze_self_evaluating = function (form) {
	return function (env) {
		return form;
	};
};

var analyze_symbol = function (form) {
	return function (env) {
		return env[form.name];
	};
};

var analyze_quote = function (form) {
	assert.equal(form.length, 2, "Invalid quote form: " + form);
	return function (env) {
		return form[1];
	};
};

var analyze_if = function (form) {
	assert.equal(true, 3 <= form.length <= 4, "Invalid if form: " + form);
	var analyzed_test, analyzed_then, analyzed_else;

	if (form.length === 3) {
		form.push(new Symbol("nil"));
	}

	analyzed_test = analyze(form[1]);
	analyzed_then = analyze(form[2]);
	analyzed_else = analyze(form[3]);

	return function (env) {
		if (analyzed_test(env)) {
			return analyzed_then(env);
		}
		return analyzed_else(env);
	};
};

var analyze_def = function (form) {
	assert.equal(3, form.length, "Invalid def form: " + form);
	var symbol = form[1],
		analyzed_body = analyze(form[2]);

	return function (env) {
		env[symbol.name] = analyzed_body(env);
	};
}

var analyze_apply = function (form) {
	var head = form.shift(),
		tail = form;
	assert.equal(true, head instanceof Symbol, "Head of form is not a Symbol: ", head);
	return function (env) {
		var f = env[head.name];
		if (typeof(f) === 'undefined') {
			throw "Unknown function: " + head.name;
		}
		return f.apply(env, tail);
	};
};

var analyze = function (form) {
	if (is_atom(form)) {
		if (is_self_evaluating(form)) {
			return analyze_self_evaluating(form);
		}

		if (form instanceof Symbol) {
			return analyze_symbol(form);
		}
	} else {
		if (equal(form[0], new Symbol("quote"))) {
			return analyze_quote(form);
		}

		if (equal(form[0], new Symbol("if"))) {
			return analyze_if(form);
		}

		if (equal(form[0], new Symbol("def"))) {
			return analyze_def(form);
		}

		return analyze_apply(form);
	}

	throw "Unhandled form: " + form[0];
};

var evaluate = function (string, env) {
	var form, analyzed, result;

	// console.log("STRING", string);
	form = read(string);
	// console.log("FORM", form);
	analyzed = analyze(form);
	// console.log("ANALYSIS", analyzed);
	result = analyzed(env);
	// console.log("RESULT", result, typeof(result));

	return result;
};
exports.evaluate = evaluate;

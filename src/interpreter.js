"use strict";

var assert = require('assert');
var Symbol = require('./runtime').Symbol;
var Keyword = require('./runtime').Keyword;
var Environment = require('./runtime').Environment;
var Lambda = require('./runtime').Lambda;
var equal = require('./runtime').equal;
var read = require('./reader').read;
var is_atom = require('./runtime').is_atom;
var is_self_evaluating = require('./runtime').is_self_evaluating;

var analyze = function (form) {
	if (is_atom(form)) {
		if (is_self_evaluating(form)) {
			return analyze.self_evaluating(form);
		}

		if (form instanceof Symbol) {
			return analyze.symbol(form);
		}
	} else {
		if (equal(form[0], new Symbol("quote"))) {
			return analyze.quote(form);
		}

		if (equal(form[0], new Symbol("if"))) {
			return analyze.if(form);
		}

		if (equal(form[0], new Symbol("def"))) {
			return analyze.def(form);
		}

		if (equal(form[0], new Symbol("fn"))) {
			return analyze.lambda(form);
		}

		return analyze.primitive(form);
	}

	throw "Unhandled form: " + form[0];
};

analyze.self_evaluating = function (form) {
	return function (env) {
		return form;
	};
};

analyze.symbol = function (form) {
	return function (env) {
		return env[form];
	};
};

analyze.quote = function (form) {
	assert.equal(form.length, 2, "Invalid quote form: " + form);
	return function (env) {
		return form[1];
	};
};

analyze.if = function (form) {
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

analyze.def = function (form) {
	assert.equal(3, form.length, "Invalid def form: " + form);
	var symbol = form[1],
		analyzed_body = analyze(form[2]);

	return function (env) {
		env[symbol] = analyzed_body(env);
		return symbol;
	};
};

analyze.lambda = function (form) {
	assert.equal(3, form.length, "Invalid fn form: " + form);
	var args = form[1].slice(1), // TODO We're slicing off the leading '#vec' here. Seems odd. Fix when we destructure binds.
		body = form[2],
		analyzed_args = analyze(args),
		analyzed_body = analyze(body);

	return function (env) {
		return new Lambda(args, analyzed_body, env);
	};
};

analyze.primitive = function (form) {
	var fn_name = form[0],
		fn_args = form.slice(1),
		analyzed_fn = analyze(fn_name),
		analyzed_args = fn_args.map(analyze);

	// Primitive.
	return function (env) {
		var fn, args, sub_env, i;

		fn = analyzed_fn(env);
		args = analyzed_args.map(function (analysis) {
			return analysis(env);
		});

		if (fn instanceof Lambda) {
			sub_env = fn.env.extend();
			assert.equal(fn.args.length, args.length, "Function " + fn_name + " called with invalid number of arguments: " + fn.args.length + ". Expected " + args.length + ":::" + fn.args );
			
			for (i = 0; i < fn.args.length; i++) {
				sub_env[fn.args[i]] = args[i];
			}

			return fn.body(sub_env);
		}

		try {
			return fn.apply(env, args); // TODO What should 'this' be?
		} catch (e) {
			throw new Error("Failed to apply function: " + fn_name);
		}
	};
};

var evaluate = function (string, env) {
	var form, analyzed, result;

	// console.log("STRING", string);
	form = read(string);
	// console.log("FORM", form);
	analyzed = analyze(form);
	// console.log("ANALYSIS", analyzed, typeof(analyzed));
	result = analyzed(env);
	// console.log("RESULT", result, typeof(result));

	return result;
};
exports.evaluate = evaluate;

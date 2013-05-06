"use strict";

var assert = require('assert');
var Symbol = require('./runtime').Symbol;
var Keyword = require('./runtime').Keyword;
var Environment = require('./runtime').Environment;
var Lambda = require('./runtime').Lambda;
var Macro = require('./runtime').Macro;
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

		if (equal(form[0], new Symbol("syntax-quote"))) {
			return analyze.syntax_quote(form);
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

		if (equal(form[0], new Symbol("macro"))) {
			return analyze.macro(form);
		}

		return analyze.application(form);
	}

	throw "Unhandled form: " + form;
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

var syntax_expand = function (form, env) {
	var result, i, expanded, analysis;

	if (is_atom(form)) {
		return form;
	}

	if (
		form.length === 2
		&&
		equal(form[0], new Symbol("unquote"))
	) {
		analysis = analyze(form[1]);
		result = analysis(env);
		return result;
	}

	result = [];
	for (i = 0; i < form.length; i = i + 1) {
		expanded = syntax_expand(form[i], env);
		result.push(expanded);
	}

	return result;
};

analyze.syntax_quote = function (form) {
	assert.equal(form.length, 2, "Invalid syntax-quote form: " + form);
	return function (env) {
		var result = syntax_expand(form[1], env);
		return result;
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

analyze.macro = function (form) {
	assert.equal(3, form.length, "Invalid macro form: " + form);
	var args = form[1].slice(1), // TODO We're slicing off the leading '#vec' here. Seems odd. Fix when we destructure binds.
		body = form[2],
		analyzed_args = analyze(args),
		analyzed_body = analyze(body);

	return function (env) {
		return new Macro(args, analyzed_body, env);
	};
};

analyze.application = function (form) {
	var fn_name = form[0],
		fn_args = form.slice(1),
		analyzed_fn,
		analyzed_args;

	// TODO We're splitting off the head only to map analyze to everything.
	analyzed_fn = analyze(fn_name);
	analyzed_args = fn_args.map(analyze);

	return function (env) {
		var fn, args, sub_env, i, expanded_code, analysis;

		fn = analyzed_fn(env);
		args = analyzed_args.map(function (analysis) {
			return analysis(env);
		});

		if (
			fn instanceof Lambda
			||
			fn instanceof Macro
		) {
			sub_env = fn.env.extend();
			assert.equal(fn.args.length, args.length, "Function " + fn_name + " called with invalid number of arguments: " + fn.args.length + ". Expected " + args.length + ":::" + fn.args);

			for (i = 0; i < fn.args.length; i = i + 1) {
				sub_env[fn.args[i]] = args[i];
			}

			if (fn instanceof Macro) {
				expanded_code = fn.body(sub_env);
				analysis = analyze(expanded_code);
				return analysis(env);
			}

			return fn.body(sub_env);
		}

		try {
			return fn.apply(env, args); // TODO What should 'this' be?
		} catch (e) {
			throw new Error("Failed to apply function: " + fn_name + " Error was: " + e);
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

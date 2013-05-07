"use strict";

var assert = require('assert');
var Symbol = require('./types').Symbol;
var Keyword = require('./types').Keyword;
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

		if (equal(form[0], new Symbol("do"))) {
			return analyze.do(form);
		}

		if (equal(form[0], new Symbol("def"))) {
			return analyze.def(form);
		}

		if (equal(form[0], new Symbol("apply"))) {
			return analyze.apply(form);
		}

		if (equal(form[0], new Symbol("fn"))) {
			return analyze.lambda(form);
		}

		if (equal(form[0], new Symbol("macro"))) {
			return analyze.macro(form);
		}

		return analyze.application(form);
	}

	throw new Error("Unhandled form: " + form);
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

analyze.do = function (form) {
	var analyzed = [], i;

	for (i = 1; i < form.length; i = i + 1) {
		analyzed.push(analyze(form[i]));
	}

	return function (env) {
		var i, result;

		for (i = 0; i < analyzed.length; i = i + 1) {
			result = analyzed[i](env);
		}

		return result;
	};
};

analyze.quote = function (form) {
	assert.equal(form.length, 2, "Invalid quote form: " + form);
	return function (env) {
		return form[1];
	};
};

var syntax_expand = function (form, env) {
	var result, i, expanded, analysis, subform;

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
		subform = form[i];

		if (
			!is_atom(subform)
			&&
			subform.length === 2
			&&
			equal(subform[0], new Symbol("unquote-splicing"))
		) {
			analysis = analyze(subform[1]);
			result = result.concat(analysis(env));
		} else {
			expanded = syntax_expand(subform, env);
			result.push(expanded);
		}
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

	// TODO can go when we get multiargs.
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

analyze.apply = function (form) {
	assert.equal(3, form.length, "Invalid apply form: " + form);
	var analyzed_arg = analyze(form[2]);

	return function (env) {
		var args = analyzed_arg(env);

		args.unshift(form[1]);
		return analyze.application(args)(env);
	};
};

var destructure_args = function (args) {
	var varargs_point, named, rest, i,
		varargs_symbol = new Symbol("&");

	// TODO We're slicing off the leading '#vec' here. Seems odd. Fix when we destructure binds.
	assert.equal(true, equal(new Symbol("vec"), args[0]), "Invalid first arg: " + args[0]);

	varargs_point = -1;
	for (i = 0; i < args.length; i = i + 1) {
		if (varargs_symbol.equal(args[i])) {
			varargs_point = i;
		}
	}

	if (varargs_point === -1) {
		named = args.slice(1);
		rest = undefined;
	} else {
		assert.equal(args.length, varargs_point + 2, "Exactly one symbol may follow '&' in a varargs declaration.");
		named = args.slice(1, varargs_point);
		rest = args.slice(varargs_point + 1);
	}

	return {named: named, rest: rest};
};

analyze.lambda = function (form) {
	assert.equal(3, form.length, "Invalid fn form: " + form);
	var args = form[1],
		body = form[2],
		analyzed_body = analyze(body),
		destructured = destructure_args(args);

	return function (env) {
		return new Lambda(destructured.named, destructured.rest, analyzed_body, env);
	} ;
};

analyze.macro = function (form) {
	assert.equal(3, form.length, "Invalid macro form: " + form);
	var args = form[1],
		body = form[2],
		analyzed_body = analyze(body),
		destructured = destructure_args(args);

	return function (env) {
		return new Macro(destructured.named, destructured.rest, analyzed_body, env);
	};
};

Environment.prototype.extend_by = function (callee, args, rest, values) {
	var i,
		sub_env = this.extend();

	if (typeof rest === "undefined") {
		assert.equal(args.length, values.length, "Callee " + callee + " called with the wrong number of arguments, Expected " + args.length + ". Got " + values.length + ".");
	} else {
		assert.equal(true, args.length <= values.length, "Callee " + callee + " called with the wrong number of arguments, Expected " + args.length + "+. Got " + values.length + ".");
	}

	for (i = 0; i < args.length; i = i + 1) {
		sub_env[args[i]] = values[i];
	}
	if (typeof rest !== "undefined" && values.length > args.length) {
		sub_env[rest] = values.slice(args.length);
	}

	return sub_env;
};

var handle_complex = function(fn, fn_name, args, env) {
	var i,
		expanded_code,
		analysis,
		sub_env;

	assert.equal(
		true,
		(
			fn instanceof Lambda
			||
			fn instanceof Macro
		),
		"Internal error - expecting Lambda or Macro. Got: " + fn
	);

	sub_env = fn.env.extend_by(fn_name, fn.args, fn.rest, args);

	if (fn instanceof Macro) {
		expanded_code = fn.body(sub_env);
		analysis = analyze(expanded_code);
		return analysis;
	}

	return function (env) {
		return fn.body(sub_env);
	};
};
exports.handle_complex = handle_complex;

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
			var expanded = handle_complex(fn, fn_name, args, env);
			return expanded(env);
		}

		try {
			return fn.apply(env, args); // TODO What should 'this' be?
		} catch (e) {
			throw new Error("Failed to apply function: " + fn_name + " Error was: " + e);
		}
	};
};
exports.analyze = analyze;

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

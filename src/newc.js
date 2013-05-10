/*global exports: true */
"use strict";

var format = require('util').format;
var assert = require('assert');
var CrispString = require('./types').CrispString;
var CrispNumber = require('./types').CrispNumber;
var CrispBoolean = require('./types').CrispBoolean;
var Symbol = require('./types').Symbol;
var Keyword = require('./types').Keyword;
var Vector = require('./types').Vector;
var List = require('./types').List;
var Environment = require('./runtime').Environment;
var Quote = require('./runtime').Quote;
var SyntaxQuote = require('./runtime').SyntaxQuote;
var Unquote = require('./runtime').Unquote;
var CrispIf = require('./runtime').CrispIf;
var CrispDef = require('./runtime').CrispDef;
var Lambda = require('./runtime').Lambda;
var Procedure = require('./runtime').Procedure;
var Macro = require('./runtime').Macro;
var equal = require('./runtime').equal;
var read_string = require('./reader').read_string;
var fs = require('fs');

// Analyze functions take a form and turn it into a (more easily)
// compilable object. In general it does this by analysing all the
// components of a list. However, it allows for some specal forms.
var analyse = function analyse(form, env) {
	if (form instanceof List) {
		if (equal(form.first(), new Symbol("quote"))) {
			return analyse.quote(form, env);
		}

		if (equal(form.first(), new Symbol("syntax-quote"))) {
			return analyse.syntax_quote(form, env);
		}

		if (equal(form.first(), new Symbol("if"))) {
			return analyse.if(form, env);
		}

		if (equal(form.first(), new Symbol("fn"))) {
			return analyse.fn(form, env);
		}

		if (equal(form.first(), new Symbol("def"))) {
			return analyse.def(form, env);
		}

		if (equal(form.first(), new Symbol("macro"))) {
			return analyse.macro(form, env);
		}

		return new Procedure(
			form.map(function (f) { return analyse(f, env); })
		);
	}

	return form;
};

analyse.quote = function (form, env) {
	return new Quote(form.second());
};

var syntax_expand = function (form, env) {
	// console.log(format("Expanding: %s", form));
	if (form instanceof List) {
		if (equal(form.first(), new Symbol("unquote"))) {
			assert.equal(2, form.count(), "Unquote takes exactly one argument.");
			// console.log("Unquote", form);
			var result = new Unquote(analyse(form.second(), env));
			// console.log("Unquote", form, "to", result);
			return result;
		}

		return form.map(function (f) { return syntax_expand(f, env); });
	}

	return form;
};

analyse.syntax_quote = function (form, env) {
	assert.equal(2, form.count(), "Syntax-quote takes exactly one argument.");
	return new SyntaxQuote(syntax_expand(form.second(), env));
};

analyse.if = function (form, env) {
	return new CrispIf(
		analyse(form.second(), env),
		analyse(form.third(), env),
		analyse(form.fourth(), env)
	);
};

analyse.def = function (form, env) {
	assert.equal(3, form.count(), "Def takes exactly two arguments.");
	var name = analyse(form.second(), env),
		value = analyse(form.third(), env);

	assert.equal(true, name instanceof Symbol, "First argument to def must be a symbol.");
	return new CrispDef(name, value);
};

analyse.sequence = function (forms, env) {
	return forms.map(function (form) { return analyse(form, env); });
};

analyse.fn = function (form, env) {
	return new Lambda(
		form.second(),
		undefined,
		analyse.sequence(form.rest().rest(), env),
		env
	);
};

analyse.macro = function (form, env) {
	var macro = new Macro(
		form.second(),
		new List([]),
		analyse.sequence(form.rest().rest(), env)
	);
	return macro;
};

// Primitives must be functions that will take compiled args, and return a compiled whole.
var primitives = {};
primitives[new Symbol("+")] = function (args) {return args.join(" + ");};
primitives[new Symbol("-")] = function (args) {return args.join(" - ");};
primitives[new Symbol("*")] = function (args) {return args.join(" * ");};
primitives[new Symbol("/")] = function (args) {return args.join(" / ");};

var compile = function compile(form, env) {
	var head, args, stored, compiled_body, compiled_args;

	if (form instanceof CrispNumber)  { return form.toString(); }
	if (form instanceof CrispBoolean) { return form.toString(); }
	if (form instanceof CrispString)  { return form.toString(); }
	if (form instanceof Symbol)       { return form.toString(); }

	if (form instanceof Quote) {
		return compile.quote(form.item, env);
	}

	if (form instanceof SyntaxQuote) {
		return compile.syntax_quote(form.item, env);
	}

	if (form instanceof CrispIf) {
		return format(
			"%s ? %s : %s",
			form.test_form,
			form.then_form,
			form.else_form
		);
	}

	if (form instanceof CrispDef) {
		return format(
			"var %s = %s",
			compile(form.name, env),
			compile(form.value, env)
		);
	}

	if (form instanceof Macro) {
		console.log("Compiling macro");
		return format("// KAJ");
	}

	if (form instanceof Lambda) {
		compiled_body = compile.sequence(form.body, form.env);
		return format(
			"(function (%s) {\n\treturn %s;\n})",
			form.args,
			compile.sequence(form.body, form.env)
		);
	}

	if (form instanceof Procedure) {
		head = form.forms.first();
		args = form.forms.rest();

		compiled_args = args.map(function (f) { return compile(f, env); });

		stored = primitives[head];
		if (typeof stored !== 'undefined') {
			return format("(%s)", stored(compiled_args));
		}

		return format("%s(%s)", compile(head, env), compiled_args.join(", "));
	}

	throw new Error(format("Unhandled compilation for form: %j", form));
};

compile.sequence = function (forms, env) {
	return forms.map(function (form) { return compile(form, env); }).join(",");
};

compile.quote_atom = function (form, env) {
	if (form instanceof CrispNumber) {
		return format("new CrispNumber(%s)", form);
	}

	if (form instanceof CrispBoolean) {
		return format("new CrispBoolean(%s)", form);
	}

	if (form instanceof CrispString) {
		return format("new CrispString(%s)", form);
	}

	if (form instanceof Symbol) {
		return format('new Symbol("%s")', form);
	}

	throw new Error(format("Unhandled compilation for quoted form: %j", form));
};

compile.quote = function (form, env) {
	if (form instanceof List) {
		return format("new List([%s])", form.map(function (f) { return compile.quote(f, env); }).join(", "));
	}

	if (form instanceof Vector) {
		return format("new Vector([%s])", form.map(function (f) { return compile.quote(f, env); }).join(", "));
	}

	return compile.quote_atom(form, env);
};

compile.syntax_quote = function (form, env) {
	if (form instanceof List) {
		return format("new List([%s])", form.map(function (f) { return compile.syntax_quote(f, env); }).join(", "));
	}

	if (form instanceof Vector) {
		return format("new Vector([%s])", form.map(function (f) { return compile.syntax_quote(f, env); }).join(", "));
	}

	if (form instanceof Unquote) {
		return compile(form.item, env);
	}

	return compile.quote_atom(form, env);
};

var compile_string = function (input, env) {
	var read, analysis, compiled, output;

	read = read_string(input);
	analysis = analyse(read.result, env);
	compiled = compile(analysis, env);

	return compiled + ";";
};
exports.compile_string = compile_string;

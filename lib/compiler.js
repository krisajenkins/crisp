/*global exports: true */
"use strict";

var format			= require('util').format;
var assert			= require('assert');
var fs				= require('fs');

var crisp = {
	types: require('./types')
};

var Symbol			= require('./types').Symbol;
var Keyword			= require('./types').Keyword;
var Vector			= require('./types').Vector;
var List			= require('./types').List;
var is_seq			= require('./types').is_seq;
var head_is			= require('./types').head_is;

var equal			= require('./runtime').equal;
var read_string		= require('./reader').read_string;

var meta = function (object) {
	if (object instanceof Object) {
		return object.__metadata__;
	}
};

var with_meta = function (metadata, object) {
	if (typeof object === "string") {
		object = new String(object);
	}

	object.__metadata__ = metadata;
	return object;
};

var macros = {};

var macroexpand_1 = function (form, env, debug) {
	var macro, result;
	if (form instanceof List) {
		macro = macros[form.first()];
		if (macro !== undefined) {
			return macro.apply(env, form.rest().items); // TODO, in the apply call, what should this be?
		}
	}

	return form;
};

var macroexpand = function (form, env) {
	var expanded = macroexpand_1(form, env);
	if (equal(form, expanded)) {
		return expanded;
	}

	return macroexpand(expanded, env);
};

var primitives = {};
primitives[new Symbol("+")]		= function (args, env) {return format("(%s)", args.join(" + ")); };
primitives[new Symbol("-")]		= function (args, env) {return format("(%s)", args.join(" - ")); };
primitives[new Symbol("*")]		= function (args, env) {return format("(%s)", args.join(" * ")); };
primitives[new Symbol("/")]		= function (args, env) {return format("(%s)", args.join(" / ")); };
primitives[new Symbol("or")]	= function (args, env) {return format("(%s)", args.join(" || ")); };
primitives[new Symbol("and")]	= function (args, env) {return format("(%s)", args.join(" && ")); };
primitives[new Symbol("=")]		= function (args, env) {return format("equal(%s)", args.join(", ")); };
primitives[new Symbol("instanceof")] = function (args, env) {
	assert.equal(2, args.count(), "instanceof takes exactly two arguments. Got: " + args.count());
	return args.join(" instanceof ");
};
primitives[new Symbol("typeof")] = function (args, env) {
	assert.equal(1, args.count(), "typeof takes exactly one argument. Got: " + args.count());
	return "typeof " + args.first();
};
primitives[new Symbol("not")] = function (args, env) {
	assert.equal(1, args.count(), "not takes exactly one argument. Got: " + args.count());
	return "!" + args.first();
};
primitives[new Symbol("aset")] = function (args, env) {
	assert.equal(2, args.count(), "aset takes exactly two arguments. Got: " + args.count());
	return format("%s = %s", args.first(), args.second());
};

var compile = function compile(form, env) {
	form = macroexpand(form, env);

	if (form === undefined) { return "undefined"; }

	if (form instanceof crisp.types.CrispNumber) { return form.toString(); }
	if (form instanceof crisp.types.CrispBoolean) { return form.toString(); }
	if (form instanceof crisp.types.CrispString) { return form.toString(); }

	if (form instanceof Symbol) {
		return compile.symbol(form, env);
	}

	if (form instanceof Vector) {
		return compile.vector(form, env);
	}

	if (head_is(form, "if")) {
		return compile.if(form, env);
	}

	if (head_is(form, "def")) {
		return compile.def(form, env);
	}

	if (head_is(form, "fn")) {
		return compile.fn(form, env);
	}

	if (head_is(form, "quote")) {
		return compile.quote(form.second(), env);
	}

	if (head_is(form, "syntax-quote")) {
		return compile.syntax_quote(form.second(), env);
	}

	if (head_is(form, "macro")) {
		return compile.macro(form, env);
	}

	if (head_is(form, "macroexpand-1")) {
		return compile.macroexpand_1(form, env);
	}

	return compile.application(form, env);
};

compile.symbol = function (form, env) {
	if (equal(form, new Symbol("nil"))) {
		return form;
	}

	var expanded = form.toString(),
		match = /(.*)\?$/.exec(expanded);

	if (match) {
		expanded = "is_" + match[1];
	}

	// JavaScript reserved symbols.
	expanded = expanded.replace(/-/g,		"_");
	expanded = expanded.replace(/\*\*/g,	"__");
	expanded = expanded.replace(/\*/g,		"STAR");
	expanded = expanded.replace(/!/g,		"BANG");

	// JavaScript reserved words.
	expanded = expanded.replace(/^do$/g,	"crisp_do");
	expanded = expanded.replace(/^let$/g,	"crisp_let");

	return format("%s", expanded);
};

compile.vector = function (form, env) {
	return form.toString();
};

compile.if = function (form, env) {
	return format(
		"%s ? %s : %s",
		compile(form.second(), env),
		compile(form.third(), env),
		compile(form.fourth(), env)
	);
};

compile.def = function (form, env) {
	var name = form.second(),
		value = form.third(),
		compiled_name,
		compiled_value,
		evaled_value,
		metadata;

	assert.equal(true, name instanceof Symbol, "First argument to def must be a symbol.");

	compiled_name = compile(name, env);
	compiled_value = compile(value, env);

	metadata = meta(compiled_value);
	if (metadata !== undefined) {
		if (metadata.macro === true) {
			macros[name] = eval(compiled_value.toString());
		}
	}

	return format(
		"var %s = %s",
		compiled_name,
		compiled_value
	);
};

compile.sequence = function (forms, env) {
	return forms.map(function (form) { return compile(form, env); }).join(",");
};

compile.fn = function (form, env) {
	var args = form.second(),
		body = form.drop(2),
	    vararg_point,
        compiled_args,
        compiled_vararg,
        compiled_body;

	vararg_point = args.indexOf(new Symbol("&"));
	if (vararg_point >= 0) {
		assert.equal(vararg_point + 2, args.count(), "Exactly one symbol must follow the & in a varargs declaration.");
		compiled_args = args.take(vararg_point).join(", ");

		compiled_vararg = format(
			"\tvar %s = new crisp.types.List(Array.prototype.slice.call(arguments, %d));\n",
			args.nth(vararg_point + 1),
			vararg_point
		);
	} else {
		compiled_args = compile(form.second(), env);
		compiled_args = form.second().join(", ");
		compiled_vararg = "";
	}
	compiled_body = compile.sequence(body, env);

	return format(
		"(function (%s) {\n%s\treturn %s;\n})",
		compiled_args,
		compiled_vararg,
		compiled_body
	);
};

compile.quote_atom = function (form, env) {
	if (form instanceof crisp.types.CrispNumber) {
		return format("new crisp.types.CrispNumber(%s)", form);
	}

	if (
		typeof form === 'boolean'
		||
		form instanceof crisp.types.CrispBoolean
	) {
		return format("new crisp.types.CrispBoolean(%s)", form);
	}

	if (form instanceof crisp.types.CrispString) {
		return format("new crisp.types.CrispString(%s)", form);
	}

	if (form instanceof Symbol) {
		return format('new crisp.types.Symbol("%s")', form);
	}

	throw new Error(format("Unhandled compilation for quoted form: %j", form));
};

compile.quote = function (form, env) {
	if (form instanceof List) {
		return format("new crisp.types.List([%s])", form.map(function (f) { return compile.quote(f, env); }).join(", "));
	}

	if (form instanceof Vector) {
		return format("new crisp.types.Vector([%s])", form.map(function (f) { return compile.quote(f, env); }).join(", "));
	}

	return compile.quote_atom(form, env);
};

compile.syntax_quote = function (form, env) {
	var join_format;

	if (form instanceof List) {
		if (head_is(form, "unquote")) {
			assert.equal(2, form.count(), "unquote takes exactly one argument.");
			return compile(form.second(), env);
		}

		if (head_is(form, "unquote-splicing")) {
			assert.equal(2, form.count(), "unquote-splicing takes exactly one argument.");
			return compile(form.second(), env);
		}
	}

	if (is_seq(form)) {
		if (form.count() === 0) {
			if (form instanceof List) {
				return "new crisp.types.List([])";
			}
			if (form instanceof Vector) {
				return "new crisp.types.Vector([])";
			}

			throw new Error("syntax-quoting an unknown sequence type: " + typeof form);
		} else {
			if (head_is(form.first(), "unquote-splicing")) {
				join_format = "%s.prepend(%s)";
			} else {
				join_format = "%s.cons(%s)";
			}

			return format(
				join_format,
				compile.syntax_quote(form.rest(), env),
				compile.syntax_quote(form.first(), env)
			);
		}
	}

	return compile.quote_atom(form, env);
};

compile.macro = function (form, env) {
	return with_meta(
		{macro: true},
		compile.fn(form, env)
	);
};

compile.macroexpand_1 = function (form, env) {
	assert.equal(true, form instanceof List, "Argument to macroexpand-1 must be a List.");
	var arg, expanded;

	assert.equal(2, form.count(), "macroexpand-1 takes exactly one argument.");
	arg = form.second();

	assert.equal(true, head_is(arg, "quote"), "Argument to macroexpand-1 must be quoted.");
	expanded = macroexpand_1(arg.second(), env);

	return compile(new List([new Symbol("quote"), expanded]), env);
};

compile.application = function (form, env) {
	var head, args, compiled_args, stored, match, expanded;

	head = form.first();
	args = form.rest();

	compiled_args = args.map(function (f) { return compile(f, env); });

	stored = primitives[head];
	if (stored !== undefined) {
		return format("%s", stored(compiled_args, env));
	}

	// Interop.
	if (head instanceof Symbol) {
		match = /(.*)\.$/.exec(head.name);
		if (match) {
			return format("new %s(%s)", compile(new Symbol(match[1]), env), compiled_args.join(", "));
		}

		match = /^.-(.*)/.exec(head.name);
		if (match) {
			assert.equal(1, args.count(), "property access takes exactly one argument.");
			return format("%s.%s", compiled_args.first(), compile(new Symbol(match[1]), env));
		}

		match = /^\.(.*)/.exec(head.name);
		if (match) {
			return format(
				"%s.%s(%s)",
				compiled_args.first(),
				compile(new Symbol(match[1], env)),
				compiled_args.rest().join(", ")
			);
		}
	}

	return format("%s(%s)", compile(head, env), compiled_args.join(", "));
};

var preamble = function () {
	return [
		"// START",
		'"use strict";\n',
		"var crisp = {};",
		"crisp.types = require('../lib/types');",
		"crisp.core = require('../lib/core');",
		"crisp.util = require('util');",
		"",
		"",
	].join("\n");
};

var postamble = function () {
	return [
		"// END",
		"",
	].join("\n");
};

var compile_string = function (input, env) {
	var read, expansion, compiled, result;

	result = [];

	while (input !== "") {
		read = read_string(input);
		input = read.remainder;

		if (
			read.type !== "WHITESPACE"
			&&
			read.type !== "COMMENT"
		) {
			compiled	= compile(read.result, env);
			result.push(compiled + ";\n");
		}
	}

	return result.join("\n") + "\n";
};
exports.compile_string = compile_string;

// TODO Make this asynchronous. (Easy, but making Grunt respect that is harder.)
var compile_io = function (input, output, env, callback) {
	var data = fs.readFileSync(input, {encoding: "utf-8"}),
		compiled = compile_string(data, env),
		full = preamble() + compiled + postamble();


	fs.writeFileSync(output, full);
};
exports.compile_io = compile_io;

var usage = "USAGE TODO";

var main = function () {
	assert.equal(process.argv.length, 4, usage);
	var input	 = process.argv[2],
		output	 = process.argv[3],
		env		 = {};

	compile_io(input, output, env, function () { console.log("Done"); });
};

if (require.main === module) {
    main();
}

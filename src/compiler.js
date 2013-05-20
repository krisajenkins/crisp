/*global exports: true */
"use strict";

var assert		= require('assert');
var fs			= require('fs');
var crisp		= require('./crisp');

var Symbol		= crisp.types.Symbol;
var Keyword		= crisp.types.Keyword;
var Vector		= crisp.types.Vector;
var List		= crisp.types.List;
var Cons		= crisp.types.Cons;
var Splice		= crisp.types.Splice;
var is_seq		= crisp.types.is_seq;
var head_is		= crisp.types.head_is;
var first		= crisp.types.first;
var second		= crisp.types.second;
var third		= crisp.types.third;
var fourth		= crisp.types.fourth;
var rest		= crisp.types.rest;
var count		= crisp.types.count;
var seq			= crisp.types.seq;
var index_of	= crisp.types.index_of;
var map			= crisp.types.map;

var equal		= require('./runtime').equal;
var apply		= require('./runtime').apply;
var read_string	= require('./reader').read_string;

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
	if (is_seq(form)) {
		macro = macros[first(form)];
		if (macro !== undefined) {
			return apply(macro, rest(form));
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
primitives[new Symbol("+")]		= function (args, env) {return crisp.core.format("(%s)", args.join(" + ")); };
primitives[new Symbol("-")]		= function (args, env) {return crisp.core.format("(%s)", args.join(" - ")); };
primitives[new Symbol("*")]		= function (args, env) {return crisp.core.format("(%s)", args.join(" * ")); };
primitives[new Symbol("/")]		= function (args, env) {return crisp.core.format("(%s)", args.join(" / ")); };
primitives[new Symbol("<")]		= function (args, env) {return crisp.core.format("(%s)", args.join(" < ")); };
primitives[new Symbol(">")]		= function (args, env) {return crisp.core.format("(%s)", args.join(" > ")); };
primitives[new Symbol("<=")]		= function (args, env) {return crisp.core.format("(%s)", args.join(" <= ")); };
primitives[new Symbol(">=")]		= function (args, env) {return crisp.core.format("(%s)", args.join(" >= ")); };
primitives[new Symbol("or")]	= function (args, env) {return crisp.core.format("(%s)", args.join(" || ")); };
primitives[new Symbol("and")]	= function (args, env) {return crisp.core.format("(%s)", args.join(" && ")); };
primitives[new Symbol("=")]		= function (args, env) {return crisp.core.format("crisp.core.equal(%s)", args.join(", ")); };
primitives[new Symbol("instanceof")] = function (args, env) {
	assert.equal(2, args.count(), "instanceof takes exactly two arguments. Got: " + args.count());
	return args.join(" instanceof ");
};
primitives[new Symbol("typeof")] = function (args, env) {
	assert.equal(1, args.count(), "typeof takes exactly one argument. Got: " + args.count());
	return "typeof " + first(args);
};
primitives[new Symbol("not")] = function (args, env) {
	assert.equal(1, args.count(), "not takes exactly one argument. Got: " + args.count());
	return "!" + first(args);
};
primitives[new Symbol("aset")] = function (args, env) {
	assert.equal(2, args.count(), "aset takes exactly two arguments. Got: " + args.count());
	return crisp.core.format("%s = %s", first(args), second(args));
};
primitives[new Symbol("gensym")] = function (args, env) {
	assert.equal(true, args.count() < 2, "aset takes at most one argument. Got: " + args.count());
	var prefix = "G__";

	if (args.count() === 1) {
		prefix = first(args);
	}

	if (env.gensym_index === undefined) {
		env.gensym_index = 0;
	}
	env.gensym_index = env.gensym_index + 1;

	return crisp.core.format("%s%d", prefix, env.gensym_index);
};

var compile = function compile(form, env) {
	form = macroexpand(form, env);

	if (form === undefined) { return "undefined"; }

	if (typeof form === "string") { return crisp.core.format("%j", form); }
	if (typeof form === "boolean") { return form; }
	if (typeof form === "number") { return form; }
	if (form instanceof crisp.types.Keyword) { return form.toString(); }

	if (form instanceof Symbol) {
		return compile.symbol(form, env);
	}

	if (form instanceof Vector) {
		return compile.vector(form, env);
	}

	if (seq(form) === undefined) {
		return "undefined";
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
		return compile.quote(second(form), env);
	}

	if (head_is(form, "syntax-quote")) {
		return compile.syntax_quote(second(form), env);
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
		match = /(.*\.)?(.*)\?$/.exec(expanded);

	if (match) {
		expanded = crisp.core.format("%sis_%s", match[1]||"", match[2]);
	}

	// JavaScript reserved symbols.
	expanded = expanded.replace(/-/g,		"_");
	expanded = expanded.replace(/\*\*/g,	"__");
	expanded = expanded.replace(/\*/g,		"STAR");
	expanded = expanded.replace(/!/g,		"BANG");

	// JavaScript reserved words.
	expanded = expanded.replace(/^do$/g,	"crisp_do");
	expanded = expanded.replace(/^let$/g,	"crisp_let");

	return crisp.core.format("%s", expanded);
};

compile.vector = function (form, env) {
	return form.toString();
};

compile.if = function (form, env) {
	return crisp.core.format(
		"%s ? %s : %s",
		compile(second(form), env),
		compile(third(form), env),
		compile(fourth(form), env)
	);
};

compile.def = function (form, env) {
	var name = second(form),
		value = third(form),
		compiled_name,
		compiled_value,
		evaled_value,
		metadata,
		statements = [];

	assert.equal(true, name instanceof Symbol, "First argument to def must be a symbol.");

	compiled_name = compile(name, env);
	compiled_value = compile(value, env);

	statements.push(
		crisp.core.format(
			"var %s = %s;",
			compiled_name,
			compiled_value
		)
	);

	metadata = meta(compiled_value);
	if (metadata !== undefined) {
		if (metadata.macro === true) {
			macros[name] = eval(compiled_value.toString());
		}

		statements.push(
			crisp.core.format(
				"%s.__metadata__ = %j;",
				compiled_name,
				metadata
			)
		);
	}

	statements.push(
		crisp.core.format(
			"exports.%s = %s",
			compiled_name,
			compiled_name
		)
	);

	return statements.join("\n");
};

compile.sequence = function (forms, env) {
	return map(
		function (form) { return compile(form, env); },
		forms
	).join(",");
};

compile.fn = function (form, env) {
	var args = second(form),
		body = rest(rest(form)),
	    vararg_point,
        compiled_args,
        compiled_vararg,
        compiled_body;

	vararg_point = index_of(new Symbol("&"), args);
	if (vararg_point >= 0) {
		assert.equal(vararg_point + 2, args.count(), "Exactly one symbol must follow the & in a varargs declaration.");
		compiled_args = args.take(vararg_point).join(", ");

		compiled_vararg = crisp.core.format(
			"\tvar %s = new crisp.types.List(Array.prototype.slice.call(arguments, %d));\n",
			args.nth(vararg_point + 1),
			vararg_point
		);
	} else {
		compiled_args = compile(second(form), env);
		compiled_args = second(form).join(", ");
		compiled_vararg = "";
	}
	compiled_body = compile.sequence(body, env);

	return crisp.core.format(
		"(function (%s) {\n%s\treturn %s;\n})",
		compiled_args,
		compiled_vararg,
		compiled_body
	);
};

compile.quote_atom = function (form, env) {
	if (typeof form === 'number') {
		return crisp.core.format("%d", form);
	}

	if (typeof form === 'boolean') {
		return crisp.core.format("%s", form);
	}

	if (typeof form === 'string') {
		return crisp.core.format("%j", form);
	}

	if (form instanceof Keyword) {
		return crisp.core.format('new crisp.types.Keyword(%s)', form);
	}

	if (form instanceof Symbol) {
		return crisp.core.format('new crisp.types.Symbol("%s")', form);
	}

	throw new Error(crisp.core.format("Unhandled compilation for quoted form: %j (type %s)", form, typeof form));
};

compile.quote = function (form, env) {
	if (form instanceof Splice) {
		return crisp.core.format(
			"new crisp.types.List([%s])",
			map(function (f) { return compile.quote(f, env); }, form).join(", ")
		);
	}

	if (form instanceof List) {
		return crisp.core.format("new crisp.types.List([%s])", form.map(function (f) { return compile.quote(f, env); }).join(", "));
	}

	if (form instanceof Cons) {
		return crisp.core.format(
			"new crisp.types.Cons(%s, %s)",
			compile.quote(first(form)),
			compile.quote(rest(form))
		);
	}

	if (form instanceof Vector) {
		return crisp.core.format("new crisp.types.Vector([%s])", form.map(function (f) { return compile.quote(f, env); }).join(", "));
	}

	return compile.quote_atom(form, env);
};

compile.syntax_quote = function (form, env) {
	var join_format;

	if (
		form instanceof List
		||
		form instanceof Cons
	) {
		if (head_is(form, "unquote")) {
			assert.equal(2, form.count(), "unquote takes exactly one argument.");
			return compile(second(form), env);
		}

		if (head_is(form, "unquote-splicing")) {
			assert.equal(2, form.count(), "unquote-splicing takes exactly one argument.");
			return compile(second(form), env);
		}
	}

	if (is_seq(form)) {
		if (count(form) === 0) {
			if (form instanceof List) {
				return "crisp.types.List.EMPTY";
			}
			if (form instanceof Cons) {
				return "crisp.types.List.EMPTY";
			}
			if (form instanceof Vector) {
				return "crisp.types.Vector.EMPTY";
			}

			throw new Error("syntax-quoting an unknown sequence type: " + typeof form);
		} else {
			if (head_is(first(form), "unquote-splicing")) {
				return crisp.core.format(
					"crisp.types.splice(%s, %s)",
					compile.syntax_quote(first(form), env),
					compile.syntax_quote(rest(form), env)
				);
			} else {
				return crisp.core.format(
					"crisp.types.cons(%s, %s)",
					compile.syntax_quote(first(form), env),
					compile.syntax_quote(rest(form), env)
				);
			}
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
	arg = second(form);

	assert.equal(true, head_is(arg, "quote"), "Argument to macroexpand-1 must be quoted.");
	expanded = macroexpand_1(second(arg), env);

	return compile(new List([new Symbol("quote"), expanded]), env);
};

compile.application = function (form, env) {
	var head, args, compiled_args, stored, match, expanded;

	head = first(form);
	args = rest(form);

	compiled_args = args.map(function (f) { return compile(f, env); });

	stored = primitives[head];
	if (stored !== undefined) {
		return crisp.core.format("%s", stored(compiled_args, env));
	}

	// Interop.
	if (head instanceof Symbol) {
		match = /(.*)\.$/.exec(head.name);
		if (match) {
			return crisp.core.format("new %s(%s)", compile(new Symbol(match[1]), env), compiled_args.join(", "));
		}

		match = /^.-(.*)/.exec(head.name);
		if (match) {
			assert.equal(1, args.count(), "property access takes exactly one argument.");
			return crisp.core.format("%s.%s", first(compiled_args), compile(new Symbol(match[1]), env));
		}

		match = /^\.(.*)/.exec(head.name);
		if (match) {
			return crisp.core.format(
				"%s.%s(%s)",
				first(compiled_args),
				compile(new Symbol(match[1], env)),
				rest(compiled_args).join(", ")
			);
		}
	}

	return crisp.core.format("%s(%s)", compile(head, env), compiled_args.join(", "));
};

var preamble = function () {
	return [
		"// START",
		'"use strict";\n',
		"var crisp = require('./crisp');",
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

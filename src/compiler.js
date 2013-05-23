/*global exports: true */
"use strict";

var assert		= require('assert');
var fs			= require('fs');
var util		= require('util');
var escodegen	= require('escodegen');
var crisp		= require('./crisp');
var ast			= require('./ast');
var primitives	= require('./primitives').primitives;

var Symbol		= crisp.types.Symbol;
var Keyword		= crisp.types.Keyword;
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
	if (object !== undefined) {
		return object.__metadata__;
	}
};

var with_meta = function (metadata, object) {
	assert.equal(true, object instanceof Object, "First argument to with_meta must be an Object.");

	object.__metadata__ = metadata;
	return object;
};

var macroexpand_1 = function (form, env, debug) {
	var lookup, metadata, result;

	if (is_seq(form)) {
		lookup = env.userspace[first(form)];
		metadata = meta(lookup);

		if (
			metadata !== undefined
				&&
				metadata.macro === true
		) {
			return apply(lookup, rest(form));
		}
	}

	return form;
};

var macroexpand = function (form, env) {
	var previous, expanded = form;

	do {
		previous = expanded;
		expanded = macroexpand_1(previous, env);
	} while (! (equal(expanded, previous)));

	return expanded;
};

var compile = function (form, env) {
	assert.equal(true, env !== undefined, "Compilation requires an environment.");
	form = macroexpand(form, env);

	if (
		typeof form === "string"
			||
			typeof form === "boolean"
			||
			form instanceof crisp.types.Keyword
	) {
		return ast.encode.literal(form);
	}

	if (typeof form === "number") {
		return compile.number(form, env);
	}

	if (form instanceof Symbol) {
		return compile.symbol(form, env);
	}

	if (form instanceof Array) {
		return compile.array(form, env);
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

compile.number = function (form, env) {
	if (form < 0) {
		return ast.encode.unary(
			"-",
			ast.encode.literal(Math.abs(form)),
			true
		);
	}

	return ast.encode.literal(form);
};

compile.symbol = function (form, env) {
	if (equal(form, new Symbol("nil"))) {
		return ast.encode.identifier('undefined');
	}

	return ast.encode.identifier(form.toString());
};

compile.array = function (form, env) {
	return form.toString();
};

compile.if = function (form, env) {
	return ast.encode.conditional(
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
	macro_code,
	metadata,
	statements = [];

	assert.equal(true, name instanceof Symbol, "First argument to def must be a symbol.");

	compiled_name = compile(name, env);
	compiled_value = compile(value, env);

	statements.push(
		ast.encode.variable(compiled_name, compiled_value)
	);

	metadata = meta(compiled_value);
	if (metadata !== undefined) {
		if (metadata.macro === true) {
			macro_code = escodegen.generate(ast.encode.box(compiled_value));
			env.userspace[name] = with_meta(
				metadata,
				eval(macro_code)
			);
		}

		statements.push(
			ast.encode.box(
				ast.encode.assignment(
					ast.encode.member(
						compiled_name,
						ast.encode.identifier('__metadata__')
					),
					ast.encode.object(metadata)
				)
			)
		);
	}

	statements.push(
		ast.encode.box(ast.encode.export(compiled_name))
	);

	return ast.encode.program(statements);
};

compile.sequence = function (forms, env) {
	switch (count(forms)) {
	case 0: return [ast.encode.return(null)];
	case 1: return [ast.encode.return(compile(first(forms), env))];
	default: return [ast.encode.box(compile(first(forms), env))].concat(compile.sequence(rest(forms), env));
	}
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
		assert.equal(vararg_point + 2, count(args), "Exactly one symbol must follow the & in a varargs declaration.");
		compiled_args = second(form).take(vararg_point).map(function (f) { return compile(f, env); });

		compiled_vararg = [ast.encode.argument_splice(
			compile(args.nth(vararg_point + 1), env),
			ast.encode.literal(vararg_point)
		)];
	} else {
		compiled_args = second(form).map(function (f) { return compile(f, env); });
		compiled_vararg = [];
	}
	compiled_body = compile.sequence(body, env);

	return ast.encode.function(
		compiled_args,
		ast.encode.block(
			compiled_vararg.concat(compiled_body)
		)
	);
};

compile.quote_atom = function (form, env) {
	if (
		typeof form === 'number'
			||
			typeof form === 'boolean'
			||
			typeof form === 'string'
	) {
		return compile(form, env);
	}

	if (form instanceof Keyword) {
		return ast.encode.new(
			ast.encode.identifier("crisp.types.Keyword"),
			[ast.encode.literal(form.name)]
		);
	}

	if (form instanceof Symbol) {
		return ast.encode.new(
			ast.encode.identifier("crisp.types.Symbol"),
			[ast.encode.literal(form.name)]
		);
	}

	throw new Error(crisp.core.format("Unhandled compilation for quoted form: %j (type %s)", form, typeof form));
};

compile.quote = function (form, env) {
	if (
		form instanceof List
			||
			form instanceof Splice
	) {
		return ast.encode.new(
			ast.encode.identifier("crisp.types.List"),
			[
				ast.encode.array(
					form.map(function (f) { return compile.quote(f, env); }).toArray()
				)
			]
		);
	}

	if (form instanceof Cons) {
		return ast.encode.call(
			ast.encode.member(
				ast.encode.member(
					ast.encode.identifier('crisp'),
					ast.encode.identifier('types')
				),
				ast.encode.identifier('cons')
			),
			[
				compile.quote(first(form), env),
				compile.quote(rest(form), env)
			]
		);
	}

	if (form instanceof Array) {
		return ast.encode.array(
			form.map(function (f) { return compile.quote(f, env); })
		);
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
			assert.equal(2, count(form), "unquote takes exactly one argument.");
			return compile(second(form), env);
		}

		if (head_is(form, "unquote-splicing")) {
			assert.equal(2, count(form), "unquote-splicing takes exactly one argument.");
			return compile(second(form), env);
		}
	}

	if (is_seq(form)) {
		if (count(form) === 0) {
			if (
				form instanceof List
					||
					form instanceof Cons
			) {
				return ast.encode.member(
					ast.encode.member(
						ast.encode.member(
							ast.encode.identifier('crisp'),
							ast.encode.identifier('types')
						),
						ast.encode.identifier('List')
					),
					ast.encode.identifier('EMPTY')
				);
			}
			if (form instanceof Array) {
				return ast.encode.array([]);
			}

			throw new Error("syntax-quoting an unknown sequence type: " + typeof form);
		} else {
			if (head_is(first(form), "unquote-splicing")) {
				return ast.encode.call(
					ast.encode.member(
						ast.encode.member(
							ast.encode.identifier('crisp'),
							ast.encode.identifier('types')
						),
						ast.encode.identifier('splice')
					),
					[
						compile.syntax_quote(first(form), env),
						compile.syntax_quote(rest(form), env)
					]
				);
			} else {
				return ast.encode.call(
					ast.encode.member(
						ast.encode.member(
							ast.encode.identifier('crisp'),
							ast.encode.identifier('types')
						),
						ast.encode.identifier('cons')
					),
					[
						compile.syntax_quote(first(form), env),
						compile.syntax_quote(rest(form), env)
					]
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

	assert.equal(2, count(form), "macroexpand-1 takes exactly one argument.");
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
		return stored(compiled_args, env);
	}

	// Interop.
	if (head instanceof Symbol) {
		match = /(.*)\.$/.exec(head.name);
		if (match) {
			return ast.encode.new(
				compile(new Symbol(match[1]), env),
				compiled_args.toArray()
			);
		}

		match = /^.-(.*)/.exec(head.name);
		if (match) {
			assert.equal(1, count(args), "property access takes exactly one argument.");
			return ast.encode.member(
				first(compiled_args),
				compile(new Symbol(match[1]), env)
			);
		}

		match = /^\.(.*)/.exec(head.name);
		if (match) {
			return ast.encode.call(
				ast.encode.member(
					first(compiled_args),
					compile(new Symbol(match[1]), env)
				),
				rest(compiled_args).toArray()
			);
		}
	}

	return ast.encode.call(
		compile(head, env),
		compiled_args.toArray()
	);
};

var preamble = function () {
	return [
		ast.encode.variable(
			ast.encode.identifier('crisp'),
			ast.encode.call(
				ast.encode.identifier('require'),
				[ast.encode.literal('./crisp')]
			)
		)
	];
};

var postamble = function () {
	return [];
};

var compile_string = function (input, env) {
	var read, to_compile, compiled,
	result = [];

	while (input !== "") {
		read = read_string(input);
		input = read.remainder;

		if (!(read.type === "WHITESPACE" || read.type === "COMMENT")) {
			compiled = compile(read.result, env);
			compiled = ast.encode.box(compiled);

			result.push(compiled);
		}
	}

	return result;
};
exports.compile_string = compile_string;

// TODO Make this asynchronous. (Easy, but making Grunt respect that is harder.)
var compile_io = function (input, output, env, callback) {
	var data, compiled_ast, compiled_output;

	data = fs.readFileSync(input, {encoding: "utf-8"});

	compiled_ast = compile_string(data, env);
	compiled_ast = ast.encode.program(preamble().concat(compiled_ast).concat(postamble(output)));

	console.log("\nCompiled ");

	compiled_output = escodegen.generate(
		compiled_ast,
		{
			format: {
				indent: {
					style: "\t"
				}
			},
			sourceMap: input,
			sourceMapWithCode: true,
		}
	);

	fs.writeFileSync(output, compiled_output.code);
};
exports.compile_io = compile_io;

var usage = "USAGE TODO";

var create_env = function () {
	return {
		crisp: crisp,
		exports: {},
		userspace: {
			defn: crisp.core.defn,
			crisp: crisp,
			defmacro: crisp.core.defmacro
		},
	};
};
exports.create_env = create_env;

var main = function () {
	assert.equal(process.argv.length, 4, usage);
	var input	= process.argv[2],
	output		= process.argv[3],
	env			= create_env();

	compile_io(input, output, env, function () { console.log("Done"); });
};

if (require.main === module) {
    main();
}

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
	if (object instanceof Object) {
		return object.metadata;
	}
};

var with_meta = function (metadata, object) {
	if (typeof object === "string") {
		object = new String(object);
	}

	object.metadata = metadata;
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


var compile = function compile(form, env) {
	form = macroexpand(form, env);

	if (form === undefined) { return "undefined"; }

	if (typeof form === "number") {
		return compile.number(form, env);
	}

	if (
		typeof form === "string"
			||
			typeof form === "boolean"
	) {
		return ast.encode.literal(form);
	}

	if (form instanceof crisp.types.Keyword) { return form.toString(); }

	if (form instanceof Symbol) {
		return compile.symbol(form, env);
	}

	if (form instanceof Array) {
		return compile.array(form, env);
	}

	if (seq(form) === undefined) {
		return ast.encode.literal("undefined");
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

	var expanded = form.name,
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

	return ast.encode.identifier(expanded);
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
	evaled_value,
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
			macros[name] = eval(macro_code);
		}

		statements.push(
			ast.encode.box(
				ast.encode.assignment(
					ast.encode.member(
						compiled_name,
						ast.encode.identifier('__metadata__')
					),
					{
						type: 'ObjectExpression',
						properties: [{
							type: 'Property',
							key: ast.encode.identifier('macro'),
							value: ast.encode.literal(true),
							kind: 'init'
						}]
					}
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
	default: return [ast.encode.box(compile(first(forms)))].concat(compile.sequence(rest(forms), env));
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
		assert.equal(vararg_point + 2, args.count(), "Exactly one symbol must follow the & in a varargs declaration.");
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

	return {
		type: 'FunctionExpression',
		id: null,
		params: compiled_args,
		defaults: [],
		body: ast.encode.block(
			compiled_vararg.concat(compiled_body)
		),
		rest: null,
		generator: false,
		expression: false
	};
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
			assert.equal(1, args.count(), "property access takes exactly one argument.");
			return ast.encode.member(
				first(compiled_args),
				compile(new Symbol(match[1], env))
			);
		}

		match = /^\.(.*)/.exec(head.name);
		if (match) {
			return ast.encode.call(
				ast.encode.member(
					first(compiled_args),
					compile(new Symbol(match[1], env))
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

var preamble = [
	ast.encode.variable(
		ast.encode.identifier('crisp'),
		ast.encode.call(
			ast.encode.identifier('require'),
			[ast.encode.literal('./crisp')]
		)
	)
];

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
	var data, compiled_ast, compiled_string;

	data = fs.readFileSync(input, {encoding: "utf-8"}),

	compiled_ast = compile_string(data, env);
	// console.log("\nCompiled");
	// console.log(util.inspect(compiled_ast, {depth: null}));
	// console.log("\nCompiled");
	compiled_string = escodegen.generate(
		ast.encode.program(preamble.concat(compiled_ast)),
		{
			format: {
				indent: {
					style: "\t"
				}
			}
		}
	);

	fs.writeFileSync(output, compiled_string);
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

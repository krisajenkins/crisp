/*global exports: true */
"use strict";

var assert		= require('assert');
var fs			= require('fs');
var escodegen	= require('escodegen');
var crisp		= require('./crisp');
var ast			= require('./ast');
var primitives	= require('./primitives').primitives;

var take		= crisp.core.take;
var nth			= crisp.core.nth;
var Symbol		= crisp.types.Symbol;
var Keyword		= crisp.types.Keyword;
var List		= crisp.types.List;
var Cons		= crisp.types.Cons;
var cons		= crisp.types.cons;
var is_seq		= crisp.types.is_seq;
var is_coll		= crisp.types.is_coll;
var head_is		= crisp.types.head_is;
var is_array	= crisp.types.is_array;
var first		= crisp.types.first;
var second		= crisp.types.second;
var third		= crisp.types.third;
var fourth		= crisp.types.fourth;
var rest		= crisp.types.rest;
var next		= crisp.types.next;
var count		= crisp.types.count;
var seq			= crisp.types.seq;
var index_of	= crisp.types.index_of;
var map			= crisp.types.map;
var into_array	= crisp.types.into_array;

var read_string	= require('./reader').read_string;

// Metadata is just a simple __metadata__ property on an object. We
// supply two helper functions, one to read and one to write.
// TODO equality checks ought to ignore metadata!
var meta = function (object) {
	if (object) {
		return object.__metadata__;
	}
};

// TODO This should preserve any existing metadata.
var with_meta = function (metadata, object) {
	assert.equal(true, object instanceof Object, "First argument to with_meta must be an Object.");

	object.__metadata__ = metadata;
	return object;
};

// macroexpand-1 is as simple as looking at the head of a form, and it
// it's a known macro, invoking that macro as a function.
// macroexpand just applies macroexpand-1 repeatedly until the form
// comes out the same as it went in.
var macroexpand_1 = function (form, env, debug) {
	var lookup, metadata, result;

	if (is_seq(form)) {
		lookup = env[first(form)];
		metadata = meta(lookup);

		if (metadata && metadata.macro === true) {
			return crisp.core.apply(lookup, rest(form));
		}
	}

	return form;
};

var macroexpand = function (form, env) {
	var previous, expanded = form, limit;

	do {
		previous = expanded;
		expanded = macroexpand_1(previous, env);
	} while (! (crisp.types.equal(expanded, previous)));

	return expanded;
};

// Compilation can be split into three areas. Simple types, special
// forms (if, def, etc...) and general function application.
var compile = function (form, env) {
	assert.equal(true, env !== undefined, "Compilation requires an environment.");
	form = macroexpand(form, env);

	// Simple types.
	if (
			typeof form === "string"
			||
			typeof form === "boolean"
			||
			form instanceof crisp.types.Keyword
	) {
		return ast.encode.literal(form);
	}

	if (form === undefined) {
		return ast.encode.identifier("undefined");
	}

	if (typeof form === "number") {
		return compile.number(form, env);
	}

	if (form instanceof Symbol) {
		return compile.symbol(form, env);
	}

	if (is_array(form)) {
		return compile.array(form, env);
	}

	// Special forms.
	if (head_is(form, "if")) {
		return compile.if(form, env);
	}

	if (head_is(form, "def")) {
		return compile.def(form, env);
	}

	if (head_is(form, "fn")) {
		return compile.fn(form, env);
	}

	if (head_is(form, "try")) {
		return compile.try(form, env);
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

	// General function application.
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
	if (crisp.types.equal(form, new Symbol("nil"))) {
		return ast.encode.identifier('undefined'); // TODO null?
	}

	return ast.encode.identifier(form.toString());
};

compile.array = function (form, env) {
	return ast.encode.array(
		into_array(map(function (f) { return compile(f, env); }, form))
	);
};

compile.if = function (form, env) {
	assert.equal(true, 3 <= count(form) <= 4, "if takes two or three arguments.");
	return ast.encode.conditional(
		compile(second(form), env),
		compile(third(form), env),
		compile(fourth(form), env)
	);
};

compile.def = function (form, env) {
	assert.equal(3, count(form), "def takes exactly two arguments.");
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

	// Store the metadata in the compiled code.
	// TODO Questionable.
	if (metadata) {
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

	// Store compiled versions of the macros.
	if (metadata && metadata.macro === true) {
		macro_code = escodegen.generate(ast.encode.box(compiled_value));
		env[name] = with_meta(
			metadata,
			eval(macro_code)
		);
	}

	if (!(metadata && metadata.private === true)) {
		statements.push(
			ast.encode.box(ast.encode.export(compiled_name))
		);
	}

	return ast.encode.program(statements);
};

compile.sequence = function (forms, env) {
	var compiled;

	switch (count(forms)) {
	case 0: return [ast.encode.return(null)];
	case 1: compiled = compile(first(forms), env);
		if (
			compiled.type === "ThrowStatement"
			||
			compiled.type === "TryStatement"
		) {
			return [compiled];
		}
		return [ast.encode.return(compiled)];
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

	// Destructuring varargs.
	vararg_point = index_of(new Symbol("&"), args);
	if (vararg_point >= 0) {
		assert.equal(vararg_point + 2, count(args), "Exactly one symbol must follow the & in a varargs declaration.");
		compiled_args = into_array(map(function (f) { return compile(f, env); }, take(vararg_point, second(form))));

		compiled_vararg = [ast.encode.argument_splice(
			compile(nth(vararg_point + 1, args), env),
			ast.encode.literal(vararg_point)
		)];
	} else {
		compiled_args = into_array(map(function (f) { return compile(f, env); }, second(form)));
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

compile.try = function (form, env) {
	var head,
	iterator = rest(form),
	body_forms = [],
	catch_form = null,
	finally_form = null;

	while (seq(iterator)) {
		head = first(iterator);
		if (head_is(head, 'catch')) {
			assert.equal(null, catch_form, "Only 1 catch form is allowed in a try block.");
			catch_form = head;
		} else if (head_is(head, 'finally')) {
			assert.equal(null, finally_form, "Only 1 finally form is allowed in a try block.");
			finally_form = head;
		} else {
			body_forms.push(head);
		}

		iterator = rest(iterator);
	}
	assert.equal(
		false,
		catch_form === null && finally_form === null,
		"A try block must have at least one (catch) or (finally) clause."
	);

	return ast.encode.call(
		ast.encode.function(
			[],
			ast.encode.block([
				ast.encode.try(
					ast.encode.block(
						compile.sequence(body_forms, env)
					),
					ast.encode.catch(
						compile(second(catch_form), env),
						ast.encode.block(
							compile.sequence(rest(rest(catch_form)), env)
						)
					),
					finally_form === null ? null : ast.encode.block(
						compile.sequence(rest(finally_form), env)
					)
				),
			])
		),
		[]
	);
};

compile.quote_atom = function (form, env) {
	if (
		form === undefined
			||
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
			form instanceof crisp.types.Splice
	) {
		return ast.encode.new(
			ast.encode.identifier("crisp.types.List"),
			[
				ast.encode.array(
					into_array(map(function (f) { return compile.quote(f, env); }, form))
				)
			]
		);
	}

	if (form instanceof Cons) {
		return ast.encode.call(
			ast.encode.identifier('crisp.types.cons'),
			[
				compile.quote(first(form), env),
				compile.quote(rest(form), env)
			]
		);
	}

	if (is_array(form)) {
		return ast.encode.array(
			into_array(
				map(function (f) { return compile.quote(f, env); }, form)
			)
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

	if (is_coll(form)) {
		if (count(form) === 0) {
			if (
				form instanceof List
					||
					form instanceof Cons
			) {
				return ast.encode.identifier('undefined');
			}
			if (is_array(form)) {
				return ast.encode.array([]);
			}

			throw new Error("syntax-quoting an unknown collection type: " + typeof form);
		} else {
			if (head_is(first(form), "unquote-splicing")) {
				return ast.encode.call(
					ast.encode.identifier('crisp.types.splice'),
					[
						compile.syntax_quote(first(form), env),
						compile.syntax_quote(rest(form), env)
					]
				);
			} else {
				return ast.encode.call(
					ast.encode.identifier('crisp.types.cons'),
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

	compiled_args = into_array(map(function (f) { return compile(f, env); }, args));

	stored = primitives[head];
	if (stored) {
		return stored(compiled_args, env);
	}

	// Interop.
	// TODO Is this a reader issue?
	if (head instanceof Symbol) {
		match = /(.*)\.$/.exec(head.name);
		if (match) {
			return ast.encode.new(
				compile(new Symbol(match[1]), env),
				compiled_args
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
				rest(compiled_args)
			);
		}
	}

	return ast.encode.call(
		compile(head, env),
		compiled_args
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

	return ast.encode.program(result);
};
exports.compile_string = compile_string;

// TODO Make this asynchronous. (Easy, but making Grunt respect that is harder.)
var compile_io = function (input, output, env, callback) {
	var data, compiled_ast, compiled_output;

	data = fs.readFileSync(input, {encoding: "utf-8"});

	compiled_ast = compile_string(data, env);
	compiled_ast = ast.encode.program(preamble().concat(compiled_ast).concat(postamble(output)));

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

var create_env = function () {
	return {
		require: require,
		exports: {},
		crisp: crisp,
		defn: crisp.core.defn,
		defmacro: crisp.core.defmacro,
		doto: crisp.core.doto,
		count: crisp.core.count,
		map: crisp.core.map,
		identity: crisp.core.identity,
		when: crisp.core.when,
		cond: crisp.core.cond,
		apply: crisp.core.apply,
		__GT_: crisp.core.__GT_,
		__GT__GT_: crisp.core.__GT__GT_,
		let_STAR_: crisp.core.let_STAR_,
		crisp_do: crisp.core.crisp_do,
		lazy_seq: crisp.core.lazy_seq,
		filter: crisp.core.filter,
		argcount: crisp.core.argcount,
		interleave: crisp.core.interleave,
		first: crisp.types.first,
		rest: crisp.types.rest,
		next: crisp.types.next,
		cons: crisp.types.cons,
		list: crisp.types.list,
		seq: crisp.types.seq,
		LazySeq: crisp.types.LazySeq,
		into_array: crisp.types.into_array,
		is_seq: crisp.types.is_seq,
		is_coll: crisp.types.is_coll,
		is_contains: crisp.core.is_contains,
		is_binds: crisp.core.is_binds,
	};
};
exports.create_env = create_env;

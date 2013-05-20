
/*global describe: true, it: true, beforeEach: true */
"use strict";

var vm				= require('vm');
var assert			= require('assert');
var escodegen		= require('escodegen');
var inspect			= require('util').inspect;
var format			= require('util').format;
var ast				= require('../build/ast');
var crisp			= require('../build/crisp');
var Symbol			= crisp.types.Symbol;
var Keyword			= crisp.types.Keyword;
var List			= crisp.types.List;
var Cons			= crisp.types.Cons;
var cons			= crisp.types.cons;
var assertEq		= require('../build/runtime').assertEq;
var Quote			= require('../build/runtime').Quote;
var Unquote			= require('../build/runtime').Unquote;
var SyntaxQuote		= require('../build/runtime').SyntaxQuote;
var Procedure		= require('../build/runtime').Procedure;
var equal			= require('../build/runtime').equal;
var compile_string	= require('../build/compiler').compile_string;

var runIn = function (source, debug, env) {
	var compiled, compiled_ast, result;

	compiled_ast = compile_string(source, env);
	compiled = escodegen.generate(
		ast.encode.program(compiled_ast)
	);

	if (debug !== undefined && debug !== false) {
		console.log("\n==== COMPILED ====");
		console.log(inspect(compiled_ast, {depth: null}));
		console.log("====\n");
		console.log(compiled);
		console.log("====\n");
	}

	try {
		result = vm.runInNewContext(compiled, env);
	} catch (e) {
		throw e;
	}

	return result;
};

var compilesTo = function (source, expected, env, message) {
	var result = runIn(source, false, env);
	assertEq(result, expected, message);
};

var kompilesTo = function (source, expected, env, message) {
	var result = runIn(source, true, env);
	assertEq(result, expected, message);
};

describe('compiler', function () {
	var env;

	beforeEach(function () {
		env = {};
		env.equal			= equal;
		env.nil				= undefined;
		env.exports			= {};
		env.crisp = require('../build/crisp');
	});

	it('Numbers', function () {
		compilesTo("123", 123, env);
		compilesTo("0.34", 0.34, env);
		compilesTo("-0.34", -0.34, env);
		compilesTo("'-0.34", -0.34, env);
	});

	it('String', function () {
		compilesTo('""', "", env);
		compilesTo('"Something"', "Something", env);
		compilesTo('\'"Something"', "Something", env);
	});

	it('nil', function () {
		compilesTo("nil", undefined, env);
		compilesTo("'nil", new Symbol("nil"), env);
	});

	it('Boolean', function () {
		compilesTo("true", true, env);
		compilesTo("'true", true, env);
	});

	it('If', function () {
		compilesTo("(if true 1 2)", 1, env);
		compilesTo("(if false 1 2)", 2, env);
		compilesTo("(if (= 3 3)  (+ 1 2) (+ 3 4))", 3, env);
		compilesTo("(if (= 3 -3) (+ 1 2) (+ 3 4))", 7, env);
	});

	it('Application', function () {
		compilesTo("(+ 1 3)", 4, env);
		compilesTo("(* 3 -3)", -9, env);
		compilesTo("(* (+ 1 3) -3)", -12, env);
	});

	it('Lambda', function () {
		compilesTo("((fn [x] x) 5)", 5, env);
		compilesTo("((fn [x y] (+ x y)) 5 9)", 14, env);
		compilesTo("((fn [x y] (* x y)) 5 (+ 2 4))", 30, env);

		compilesTo("((fn [x] (* x 4) 1) 5)", 1, env);
	});

	it('Varargs functions', function () {
		compilesTo("((fn [& xs] xs) 1 2 3 4 5)", [1, 2, 3, 4, 5], env);

		compilesTo("((fn [x & xs] x) 1 2 3 4 5)", 1, env);
		compilesTo("((fn [x & xs] xs) 1 2 3 4 5)", [2, 3, 4, 5], env);

		compilesTo("((fn [x y & xs] x) 1 2 3 4 5)", 1, env);
		compilesTo("((fn [x y & xs] y) 1 2 3 4 5)", 2, env);
		compilesTo("((fn [x y & xs] xs) 1 2 3 4 5)", [3, 4, 5], env);
	});

	it('Def', function () {
		runIn("(def a 5)", false, env);
		compilesTo("a", 5, env);

		runIn("(def double (fn [x] (* 2 x)))", false, env);
		compilesTo("(double 5)", 10, env);
		compilesTo("(double 12)", 24, env);
	});

	it('Quote', function () {
		compilesTo("'1", 1, env);
		compilesTo("'\"thing\"", "thing", env);
		compilesTo("'(1 2 \"test\")", new List([1, 2, "test"]), env);
		compilesTo("'[1 2 \"test\"]", [1, 2, "test"], env);
		compilesTo("'(1 '(2 3))", new List([1, new List([new Symbol("quote"), new List([2, 3])])]), env);
	});

	it('Simple Syntax Quote', function () {
		compilesTo("`1", 1, env);
		compilesTo("`\"thing\"", "thing", env);
		compilesTo(
			'`(1 2 "test")',
			new List([
				1,
				2,
				"test"
			]),
			env
		);
		compilesTo(
			'`[1 2 "test"]',
			cons(1,
				 cons(2,
					  cons("test",
						   Array.EMPTY))),
			env
		);

		compilesTo(
			"`(1 '(2 3))",
			cons(1,
				 cons(cons(new Symbol("quote"),
						   cons(cons(2,
									 cons(3, List.EMPTY)),
								List.EMPTY)),
					  List.EMPTY)),
			env
		);
	});

	it('Syntax Quote/Unquote', function () {
		runIn("(def b 5)", false, env);
		runIn("(def id (fn [x] x))", false, env);

		compilesTo("`a", new Symbol("a"), env);
		compilesTo("`(a b)", cons(new Symbol("a"), cons(new Symbol("b"), List.EMPTY)), env);
		compilesTo("`(a ~b)", cons(new Symbol("a"), cons(5, List.EMPTY)), env);

		compilesTo(
			"`(a ~b c (d e) ~(id 'f))",
			cons(new Symbol("a"),
				 cons(5,
					  cons(new Symbol("c"),
						   cons(cons(new Symbol("d"),
									 cons(new Symbol("e"),
										  List.EMPTY)),
								cons(new Symbol("f"),
									 List.EMPTY))))),
			env
		);
	});

	it('Unquote-slicing', function () {
		runIn("(def b '(1 2 3))", false, env);

		compilesTo(
			"`(a ~@b c)",
			new List([
				new Symbol("a"),
				1,
				2,
				3,
				new Symbol("c"),
			]),
			env
		);

		compilesTo(
			"`[a ~@b c]",
			[
				new Symbol("a"),
				1,
				2,
				3,
				new Symbol("c"),
			],
			env
		);

		compilesTo(
			"`~@b",
			new List([
				1,
				2,
				3,
			]),
			env
		);

	});

	it('Simple Macros', function () {
		runIn("(def unless (macro [test body] `(if ~test nil ~body)))", false, env);
		compilesTo("(unless true 1)", undefined, env);
		compilesTo("(unless false 5)", 5, env);

		compilesTo(
			"(macroexpand-1 '(unless false 5))",
			new List([
				new Symbol("if"),
				false,
				new Symbol("nil"),
				5,
			]),
			env
		);

		runIn("(def doit (macro [& body] `((fn [] ~@body))))", false, env);
		compilesTo("(doit 1 (+ 2 4) 6)", 6, env);
	});

	it('Nested Macros', function () {
	});

	it('aset', function () {
		runIn("(def a 5)", false, env);
		runIn("(aset a 10)", false, env);
		compilesTo("a", 10, env);
	});

	it('Interop', function () {
		runIn('(def Person (fn [name] (aset this.name name) (aset this.greet (fn [] (+ "Hello " this.name))) this))', false, env);
		runIn('(def a-person (Person. "Kris"))', false, env);
		compilesTo("(.-name a-person)", "Kris", env);
		compilesTo("(.greet a-person)", "Hello Kris", env);
	});

	it('Recursion', function () {
		runIn('(def dec (fn [n] (- n 1)))', false, env);
		runIn('(def fact (fn [n] (if (> 2 n) 1 (* n (fact (dec n))))))', false, env);
		compilesTo("(fact 5)", 120, env);
		compilesTo("(fact 10)", 3628800, env);
	});
});

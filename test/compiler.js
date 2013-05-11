
/*global describe: true, it: true, beforeEach: true */
"use strict";

var vm = require('vm');
var format = require('util').format;
var assert = require('assert');

var Symbol = require('../lib/types').Symbol;
var CrispString = require('../lib/types').CrispString;
var CrispNumber = require('../lib/types').CrispNumber;
var CrispBoolean = require('../lib/types').CrispBoolean;
var Keyword = require('../lib/types').Keyword;
var Vector = require('../lib/types').Vector;
var List = require('../lib/types').List;
var Quote = require('../lib/runtime').Quote;
var Unquote = require('../lib/runtime').Unquote;
var SyntaxQuote = require('../lib/runtime').SyntaxQuote;
var Procedure = require('../lib/runtime').Procedure;
var equal = require('../lib/runtime').equal;

var compile_string = require('../lib/compiler').compile_string;

var runIn = function (source, debug, env) {
	var compiled, result;

	compiled = compile_string(source, env);

	if (typeof debug !== "undefined" && debug !== false) {
		console.log("\n==== COMPILED ====");
		console.log(compiled);
		console.log(env);
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
	assert.deepEqual(result, expected, message);
};

var kompilesTo = function (source, expected, env, message) {
	var result = runIn(source, true, env);
	assert.deepEqual(result, expected, message);
};

describe('compiler', function () {
	var env;

	beforeEach(function () {
		env = {};
		env.CrispNumber		= CrispNumber;
		env.CrispString		= CrispString;
		env.CrispBoolean	= CrispBoolean;
		env.List			= List;
		env.Vector			= Vector;
		env.Symbol			= Symbol;
		env.Quote			= Quote;
		env.Unquote			= Unquote;
		env.SyntaxQuote		= SyntaxQuote;
		env.Procedure		= Procedure;
		env.equal			= equal;
		env.nil				= undefined;
	});

	it('Numbers', function () {
		compilesTo("123", 123, env);
		compilesTo("0.34", 0.34, env);
		compilesTo("-0.34", -0.34, env);
		compilesTo("'-0.34", new CrispNumber(-0.34), env);
	});

	it('String', function () {
		compilesTo('""', "", env);
		compilesTo('"Something"', "Something", env);
		compilesTo('\'"Something"', new CrispString("Something"), env);
	});

	it('Boolean', function () {
		compilesTo("true", true, env);
		compilesTo("'true", new CrispBoolean(true), env);
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
		compilesTo("((fn [x] (* x 4) 1) 5)", 1, env);
		compilesTo("((fn [x y] (* x y)) 5 (+ 2 4))", 30, env);
	});

	it('Def', function () {
		runIn("(def a 5)", false, env);
		compilesTo("a", 5, env);

		runIn("(def double (fn [x] (* 2 x)))", false, env);
		compilesTo("(double 5)", 10, env);
		compilesTo("(double 12)", 24, env);
	});

	it('Quote', function () {
		compilesTo("'1", new CrispNumber(1), env);
		compilesTo("'\"thing\"", new CrispString("thing"), env);
		compilesTo("'(1 2 \"test\")", new List([new CrispNumber(1), new CrispNumber(2), new CrispString("test")]), env);
		compilesTo("'[1 2 \"test\"]", new Vector([new CrispNumber(1), new CrispNumber(2), new CrispString("test")]), env);
		compilesTo("'(1 '(2 3))", new List([new CrispNumber(1), new List([new Symbol("quote"), new List([new CrispNumber(2), new CrispNumber(3)])])]), env);
	});

	it('Simple Syntax Quote', function () {
		compilesTo("`1", new CrispNumber(1), env);
		compilesTo("`\"thing\"", new CrispString("thing"), env);
		compilesTo('`(1 2 "test")', new List([new CrispNumber(1), new CrispNumber(2), new CrispString("test")]), env);
		compilesTo('`[1 2 "test"]', new Vector([new CrispNumber(1), new CrispNumber(2), new CrispString("test")]), env);
		compilesTo("`(1 '(2 3))", new List([new CrispNumber(1), new List([new Symbol("quote"), new List([new CrispNumber(2), new CrispNumber(3)])])]), env);
	});

	it('Syntax Quote/Unquote', function () {
		runIn("(def b 5)", false, env);
		runIn("(def id (fn [x] x))", false, env);

		compilesTo("`a", new Symbol("a"), env);
		compilesTo("`(a b)", new List([new Symbol("a"), new Symbol("b")]), env);
		compilesTo("`(a ~b)", new List([new Symbol("a"), 5]), env);

		compilesTo(
			"`(a ~b c (d e) ~(id 'f))",
			new List([
				new Symbol("a"),
				5,
				new Symbol("c"),
				new List([
					new Symbol("d"),
					new Symbol("e"),
				]),
				new Symbol("f"),
			]),
			env
		);
	});

	// it('Unquote-slicing', function () {
	// 	runIn("(def b '(1 2 3))", false, env);

	// 	kompilesTo(
	// 		"`(a ~@b)",
	// 		new List([
	// 			new Symbol("a"),
	// 			1,
	// 			2,
	// 			3
	// 		]),
	// 		env
	// 	);

	// 	compilesTo(
	// 		"`[a ~@b]",
	// 		new Vector([
	// 			new Symbol("a"),
	// 			1,
	// 			2,
	// 			3
	// 		]),
	// 		env
	// 	);
	// });

	it('Macros', function () {
		runIn("(def unless (macro [test body] `(if ~test nil ~body)))", false, env);
		compilesTo("(unless true 1)", undefined, env);
		compilesTo("(unless false 5)", 5, env);
	});
});

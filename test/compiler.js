/*global describe: true, it: true, beforeEach: true */
"use strict";

var vm = require('vm');
var format = require('util').format;
var assert = require('assert');

var Symbol = require('../lib/types').Symbol;
var CrispString = require('../lib/types').CrispString;
var CrispBoolean = require('../lib/types').CrispBoolean;
var Keyword = require('../lib/types').Keyword;
var Vector = require('../lib/types').Vector;
var List = require('../lib/types').List;

var compile_string;
var compile_string = require('../lib/compiler').compile_string;
var base_environment = require('../lib/compiler').base_environment;

var runIn = function (source, debug, env) {
	var compiled, result;

	compiled = compile_string(source, env);

	if (typeof debug !== "undefined" && debug !== false) {
		console.log("\n====");
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
	assert.deepEqual(result, expected, message);
};

var kompilesTo = function (source, expected, env, message) {
	var result = runIn(source, true, env);
	assert.deepEqual(result, expected, message);
};

describe('compiler', function () {
	var env;

	beforeEach(function () {
		env = base_environment.extend();
		env.require = require;
	});

	it('Numbers', function () {
		compilesTo("123", 123, env);
		compilesTo("0.34", 0.34, env);
		compilesTo("-0.34", -0.34, env);
	});

	it('Crisp Strings', function () {
		compilesTo('"thing"', "thing", env);
		compilesTo('\'"thing"', new CrispString("thing"), env);
	});

	it('Bools', function () {
		compilesTo("true", true, env);
		compilesTo("false", false, env);
		compilesTo("'true", new CrispBoolean("true"), env);
		compilesTo("'false", new CrispBoolean("false"), env);
	});

	it('Symbols', function () {
		env.name = "TEST";
		compilesTo("name", "TEST", env);
		compilesTo("'name", new Symbol("name"), env);
	});

	it('Keywords', function () {
		compilesTo(":thing", ":thing", env);
		compilesTo("'thing", new Keyword("thing"), env);
	});

	it('Quote', function () {
		compilesTo("'true", new CrispBoolean("true"), env);
		compilesTo("'name", new Symbol("name"), env);
		compilesTo("':name", new Keyword("name"), env);
		compilesTo("'[1 2 3]", new Vector([1, 2, 3]), env);
		compilesTo("'(1 2 3)", new List([1, 2, 3]), env);
		compilesTo(
			'\'(1 name "test" :thing [1 2 3] (4 5 6))',
			new List([
				1,
				new Symbol("name"),
				new CrispString("test"),
				new Keyword("thing"),
				new Vector([1, 2, 3]),
				new List([4, 5, 6]),
			]),
			env
		);
	});

	it('Apply Primitive', function () {
		compilesTo("(+ 1 2)", 3, env);
		compilesTo("(+ 1 -2 -5)", -6, env);
		compilesTo("(- 5 2)", 3, env);
		compilesTo("(- 5 2 1)", 2, env);

		compilesTo("(* 3 4 5)", 60, env);
		compilesTo("(/ 20 2 5)", 2, env);

		compilesTo("(= 1 2)", new CrispBoolean("false"), env);
		compilesTo("(= 2 2)", new CrispBoolean("true"), env);
		compilesTo('(= "test" "test")', new CrispBoolean("true"), env);
		compilesTo('(= "test" "toast")', new CrispBoolean("false"), env);
	});

	/*
	it('Recursive Apply Primitive', function () {
		compilesTo("(* (+ 1 2) (/ 10 2))", 15, env);
	});

	it('if', function () {
		compilesTo("(if true 1 2)", 1, env);
		compilesTo("(if false 1 2)", 2, env);
		compilesTo("(if (= 2 2) (+ 1 2) (- 5 1))", 3, env);
		compilesTo("(if (= 1 2) (+ 1 2) (- 5 1))", 4, env);
		compilesTo("(if (= 1 2) (+ 1 2) (- 5 1))", 4, env);
	});

	it('def', function () {
		runIn("(def foo 5)", false, env);
		runIn('(def bar "test")', false, env);
		runIn('(def who foo)', false, env);
		runIn('(def pah (+ 3 5))', false, env);

		assert.deepEqual(env.foo, 5);
		assert.deepEqual(env.bar, new CrispString("test"));
		assert.deepEqual(env.who, 5);
		assert.deepEqual(env.pah, 8);
	});

	it('fn', function () {
		runIn("(fn [x] x)", false, env);
		runIn("(def identity (fn [x] x))", false, env);
		runIn("(def double (fn [x] (* 2 x)))", false, env);
		runIn("(def triple (fn [x] (* 3 x)))", false, env);

		compilesTo("(identity 5)", 5, env);
		compilesTo("(double 5)", 10, env);
		compilesTo("(double 0)", 0, env);
		compilesTo("(triple 5)", 15, env);

		compilesTo("((if true  double triple) 8)", 16, env);
		compilesTo("((if false double triple) 8)", 24, env);
	});

	it('fn bodies', function () {
		runIn("(def Person (fn [name age] (set! this.name name) (set! this.age age) this))", false, env);
		compilesTo('(Person. "kris" 35)', {name: new CrispString("kris"), age: 35}, env);
	});

	it('Apply', function () {
		compilesTo("(+ 5 3)", 8, env);
		runIn("(def plus (fn [x y] (+ x y)))", true, env);
		runIn("(apply plus '(5 3))", 8, env);
	});

	it('Argument count', function () {
		runIn("(def double (fn [x] (* 2 x)))", true, env);
		compilesTo("(double 3)", 6, env);
		assert.throws(
			function () {
				runIn("(double)", true,  env);
			}
		);
		assert.throws(
			function () {
				runIn("(double 1 2)", false, env);
			}
		);
	});

	it('Interop', function () {
		runIn("(def Person (fn [name] (set! this.name name) this))", false, env);
		runIn('(set! Person.prototype.greet (fn [] this.name))', false, env);

		compilesTo('(def kris (Person. "Kris")) kris', {name: new CrispString("Kris")}, env);
		compilesTo('(.-name kris)', new CrispString("Kris"), env);
		compilesTo('(.greet kris)', new CrispString("Kris"), env);
	});

	it('Varargs', function () {
		compilesTo("(def thing_a (fn [x]))           (thing_a 5)", undefined, env);
		compilesTo("(def thing_b (fn [x] x))         (thing_b 5)", 5, env);
		compilesTo("(def thing_c (fn [x & xs] x))    (thing_c 5)", 5, env);
		compilesTo("(def thing_d (fn [x & xs] xs))   (thing_d 3 5)", [5], env);
		compilesTo("(def thing_e (fn [x y & xs] xs)) (thing_e 1 3 5)", [5], env);
	});

	it('Simple Macro', function () {
		runIn("(def unless (macro [test form] `(if (not ~test) ~form)))", false, env);
		compilesTo("(def unless (macro [test form] `(if (not ~test) ~form)))", false, env);
		compilesTo("(unless false (+ 1 3))", 4, env);
		compilesTo("(unless false (+ 1 3))", 4, env);
		compilesTo("(unless true (+ 1 3))", undefined, env);
		compilesTo("(unless false ((fn [x] (* 2 x)) 4))", 8, env);
		// compilesTo("(unless false ((fn [x] (* 2 x)) 4))", 8, env);
	});

	it('Varargs Macro', function () {
		runIn("(def do (macro [& body] `((fn [] ~@body))))", env);
		runIn("(def when (macro [test & body] `(if ~test (do ~@body))))", env); // TODO Use 'do'
		runIn("(when true 5 4 3)", env);
		compilesTo("(when true 5 4 3)", 3, env);
		compilesTo("(when false 5 4 3)", undefined, env);
	});

	it('First, Second and Rest', function () {
		// compilesTo("(first nil)", undefined, env);
		// runIn("(+ 1 3)", env, true);
		// runIn("'(1 2 3 4 5)", env, true);
		// runIn("(first '(1 2 3 4 5))", env, true);
		compilesTo("(first '(1 2 3 4 5))", 1, env);

		// compilesTo("(second nil)", undefined);
		// compilesTo("(second '(1 2 3 4 5))", 2, env);

		// compilesTo("(rest nil)", undefined);
		// compilesTo("(rest '(1 2 3 4 5))", [2, 3, 4, 5], env);
	});
	*/
});

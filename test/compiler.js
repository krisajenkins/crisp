/*global describe: true, it: true, beforeEach: true */
"use strict";

var vm = require('vm');
var assert = require('assert');
var compile_string = require('../lib/compiler').compile_string;

var runIn = function (source, context) {
	var compiled, result;

	compiled = compile_string(source);

	try {
		result = vm.runInNewContext(compiled, context);
	} catch (e) {
		throw e;
	}

	return result;
};

var compilesTo = function(source, expected, context, message) {
	var result = runIn(source, context);
	assert.deepEqual(result, expected, message);
};

describe('compiler', function () {
	var context;

	beforeEach(function () {
		context = {};
	});

	it('Numbers', function () {
		compilesTo("123", 123, {});
		compilesTo("0.34", 0.34, {});
		compilesTo("-0.34", -0.34, {});
	});

	it('Strings', function () {
		compilesTo('"test"', "test", {});
	});

	it('Bools', function () {
		compilesTo("true", true, {});
		compilesTo("false", false, {});
	});

	it('Symbols', function () {
		compilesTo("name", "TEST", {name: "TEST"});
	});

	/* TODO
	it('Quote', function () {
		compilesTo("(quote name)", "name", {});
	});
	*/

	it('Apply Primitive', function () {
		compilesTo("(+ 1 2)", 3, {});
		compilesTo("(+ 1 -2 -5)", -6, {});
		compilesTo("(- 5 2)", 3, {});
		compilesTo("(- 5 2 1)", 2, {});

		compilesTo("(* 3 4 5)", 60, {});
		compilesTo("(/ 20 2 5)", 2, {});

		compilesTo("(= 1 2)", false, {});
		compilesTo("(= 2 2)", true, {});
		compilesTo('(= "test" "test")', true, {});
		compilesTo('(= "test" "toast")', false, {});
	});

	it('Recursive Apply Primitive', function () {
		compilesTo("(* (+ 1 2) (/ 10 2))", 15, {});
	});

	it('if', function () {
		compilesTo("(if true 1 2)", 1, {});
		compilesTo("(if false 1 2)", 2, {});
		compilesTo("(if (= 2 2) (+ 1 2) (- 5 1))", 3, {});
		compilesTo("(if (= 1 2) (+ 1 2) (- 5 1))", 4, {});
	});

	it('def', function () {
		runIn("(def foo 5)", context);
		runIn('(def bar "test")', context);
		runIn('(def who foo)', context);
		runIn('(def pah (+ 3 5))', context);

		assert.deepEqual(context, {
			foo: 5,
			bar: "test",
			who: 5,
			pah: 8
		});
	});

	it('fn', function () {
		runIn("(def identity (fn [x] x))", context);
		runIn("(def double (fn [x] (* 2 x)))", context);
		runIn("(def triple (fn [x] (* 3 x)))", context);

		compilesTo("(identity 5)", 5, context);
		compilesTo("(double 5)", 10, context);
		compilesTo("(double 0)", 0, context);
		compilesTo("(triple 5)", 15, context);

		compilesTo("((if true  double triple) 8)", 16, context);
		compilesTo("((if false double triple) 8)", 24, context);
	});

	it('fn bodies', function () {
		runIn("(def Person (fn [name age] (set! this.name name) (set! this.age age) this))", context);
		compilesTo('(Person. "kris" 35)', {name: "kris", age: 35}, context);
	});

	/* TODO
	it('Apply', function () {
		compilesTo("(+ 5 3)", 8, {});
		compilesTo("(apply + '(5 3))", 8, {});
	});
	*/

	/* TODO
	it('Argument count', function () {
		runIn("(def double (fn [x] (* 2 x)))", context);
		compilesTo("(double 3)", 6, context);
		assert.throws(
			function () {
				runIn("(double)", context);
			}
		);
		assert.throws(
			function () {
				runIn("(double 1 2)", context);
			}
		);
	});
	*/

	it('Varargs', function () {
		compilesTo("(def thing_a (fn [x]))           (thing_a 5)", undefined, {});
		compilesTo("(def thing_b (fn [x] x))         (thing_b 5)", 5, {});
		compilesTo("(def thing_c (fn [x & xs] x))    (thing_c 5)", 5, {});
		compilesTo("(def thing_d (fn [x & xs] xs))   (thing_d 3 5)", [5], {});
		compilesTo("(def thing_e (fn [x y & xs] xs)) (thing_e 1 3 5)", [5], {});
	});

	/* TODO
	it('Simple Macro', function () {
		evaluate("(def unless (macro [test form] `(if (not ~test) ~form)))", env);
		assert.equal(evaluate("(unless false 1)", env), 1);
		assert.equal(evaluate("(unless true 1)", env), undefined);
	});
	it('Varargs Macro', function () {
		evaluate("(def when (macro [test & body] `(if ~test (do ~@body))))", env);
		assert.equal(evaluate("(when true 5 4 3)", env), 3);
		assert.equal(evaluate("(when false 5 4 3)", env), undefined);
	});
	*/

});

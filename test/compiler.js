/*global describe: true, it: true, beforeEach: true */
"use strict";

var vm = require('vm');
var assert = require('assert');
var compile_string = require('../lib/compiler').compile_string;
var base_environment = require('../lib/compiler').base_environment;

var runIn = function (source, env, debug) {
	var compiled, result;

	compiled = compile_string(source, env);

	if (debug) {
		console.log();
		console.log("====");
		console.log(env);
		console.log("====");
		console.log(compiled);
		console.log("====");
	}

	try {
		result = vm.runInNewContext(compiled, env);
	} catch (e) {
		throw e;
	}

	return result;
};

var compilesTo = function(source, expected, env, message) {
	var result = runIn(source, env);
	assert.deepEqual(result, expected, message);
};

describe('compiler', function () {
	var env;

	beforeEach(function () {
		env = base_environment.extend();
	});

	it('Numbers', function () {
		compilesTo("123", 123, env);
		compilesTo("0.34", 0.34, env);
		compilesTo("-0.34", -0.34, env);
	});

	it('Strings', function () {
		compilesTo('"test"', "test", env);
	});

	it('Bools', function () {
		compilesTo("true", true, env);
		compilesTo("false", false, env);
	});

	it('Symbols', function () {
		compilesTo("name", "TEST", {name: "TEST"});
	});

	it('Keywords', function () {
		compilesTo(":thing", ":thing", env );
	});

	/*
	it('Quote', function () {
		compilesTo("(quote name)", "name", env);
	});
	*/

	it('Apply Primitive', function () {
		compilesTo("(+ 1 2)", 3, env);
		compilesTo("(+ 1 -2 -5)", -6, env);
		compilesTo("(- 5 2)", 3, env);
		compilesTo("(- 5 2 1)", 2, env);

		compilesTo("(* 3 4 5)", 60, env);
		compilesTo("(/ 20 2 5)", 2, env);

		compilesTo("(= 1 2)", false, env);
		compilesTo("(= 2 2)", true, env);
		compilesTo('(= "test" "test")', true, env);
		compilesTo('(= "test" "toast")', false, env);
	});

	it('Recursive Apply Primitive', function () {
		compilesTo("(* (+ 1 2) (/ 10 2))", 15, env);
	});

	it('if', function () {
		compilesTo("(if true 1 2)", 1, env);
		compilesTo("(if false 1 2)", 2, env);
		compilesTo("(if (= 2 2) (+ 1 2) (- 5 1))", 3, env);
		compilesTo("(if (= 1 2) (+ 1 2) (- 5 1))", 4, env);
	});

	it('def', function () {
		runIn("(def foo 5)", env);
		runIn('(def bar "test")', env);
		runIn('(def who foo)', env);
		runIn('(def pah (+ 3 5))', env);

		assert.deepEqual(env, {
			foo: 5,
			bar: "test",
			who: 5,
			pah: 8
		});
	});

	it('fn', function () {
		runIn("(def identity (fn [x] x))", env);
		runIn("(def double (fn [x] (* 2 x)))", env);
		runIn("(def triple (fn [x] (* 3 x)))", env);

		compilesTo("(identity 5)", 5, env);
		compilesTo("(double 5)", 10, env);
		compilesTo("(double 0)", 0, env);
		compilesTo("(triple 5)", 15, env);

		compilesTo("((if true  double triple) 8)", 16, env);
		compilesTo("((if false double triple) 8)", 24, env);
	});

	it('fn bodies', function () {
		runIn("(def Person (fn [name age] (set! this.name name) (set! this.age age) this))", env);
		compilesTo('(Person. "kris" 35)', {name: "kris", age: 35}, env);
	});

	/*
	it('Apply', function () {
		compilesTo("(+ 5 3)", 8, env);
		compilesTo("(apply + '(5 3))", 8, env);
	});

	it('Argument count', function () {
		runIn("(def double (fn [x] (* 2 x)))", env);
		compilesTo("(double 3)", 6, env);
		assert.throws(
			function () {
				runIn("(double)", env);
			}
		);
		assert.throws(
			function () {
				runIn("(double 1 2)", env);
			}
		);
	});
	*/

	it('Interop', function () {
		runIn("(def Person (fn [name] (set! this.name name) this))", env);
		runIn('(set! Person.prototype.greet (fn [] (+ "Hello " this.name)))', env);

		compilesTo('(def kris (Person. "Kris")) kris', {name: "Kris"}, env);
		compilesTo('(.-name kris)', "Kris", env);
		compilesTo('(.greet kris)', "Hello Kris", env);
	});

	it('Varargs', function () {
		compilesTo("(def thing_a (fn [x]))           (thing_a 5)", undefined, env);
		compilesTo("(def thing_b (fn [x] x))         (thing_b 5)", 5, env);
		compilesTo("(def thing_c (fn [x & xs] x))    (thing_c 5)", 5, env);
		compilesTo("(def thing_d (fn [x & xs] xs))   (thing_d 3 5)", [5], env);
		compilesTo("(def thing_e (fn [x y & xs] xs)) (thing_e 1 3 5)", [5], env);
	});

	it('Simple Macro', function () {
		runIn("(def unless (macro [test form] `(if (not ~test) ~form)))", env);
		compilesTo("(unless false (+ 1 3))", 4, env);
		compilesTo("(unless true (+ 1 3))", undefined, env);
	});

	it('Varargs Macro', function () {
		runIn("(def do (macro [& body] `((fn [] ~@body))))", env);
		runIn("(def when (macro [test & body] `(if ~test (do ~@body))))", env); // TODO Use 'do'
		runIn("(when true 5 4 3)", env);
		compilesTo("(when true 5 4 3)", 3, env);
		compilesTo("(when false 5 4 3)", undefined, env);
	});
});

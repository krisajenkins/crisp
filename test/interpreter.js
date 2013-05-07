/*global describe: true, it: true, beforeEach: true */
"use strict";

var assert = require('assert');
var evaluate = require('../lib/interpreter').evaluate;
var Symbol = require('../lib/types').Symbol;
var Keyword = require('../lib/types').Keyword;
var base_environment = require('../lib/compiler').base_environment;

describe('interpreter', function () {
	var env;

	beforeEach(function () {
		env = base_environment.extend();
	});

	it('Numbers', function () {
		assert.equal(evaluate("123", env), 123);
		assert.equal(evaluate("0.34", env), 0.34);
		assert.equal(evaluate("-0.34", env), -0.34);
	});

	it('Strings', function () {
		assert.equal(evaluate('"test"'), "test");
	});

	it('Quote', function () {
		assert.deepEqual(evaluate("'a", env), new Symbol("a"));
		assert.deepEqual(evaluate("'(a b)", env), [new Symbol("a"), new Symbol("b")]);
		assert.throws(
			function () {
				evaluate("(quote a b)", env);
			}
		);
	});

	it('Apply Primitive', function () {
		assert.equal(evaluate("(+ 1 2)", env), 3);
		assert.equal(evaluate("(+ 1 -2 -5)", env), -6);
		assert.equal(evaluate("(- 5 2)", env), 3);
		assert.equal(evaluate("(- 5 2 1)", env), 2);

		assert.equal(evaluate("(* 3 4 5)", env), 60);
		assert.equal(evaluate("(/ 20 2 5)", env), 2);

		assert.equal(evaluate("(= 1 2)", env), false);
		assert.equal(evaluate("(= 2 2)", env), true);
		assert.equal(evaluate('(= "test" "test")', env), true);
		assert.equal(evaluate('(= "test" "toast")', env), false);

		assert.equal(evaluate("(nil? nil)", env), true);
		assert.equal(evaluate("(nil? 5)", env), false);
	});

	it('Recursive Apply Primitive', function () {
		assert.equal(evaluate("(* (+ 1 2) (/ 10 2))", env), 15);
	});

	it('if', function () {
		assert.equal(evaluate("(if true 1 2)", env), 1);
		assert.equal(evaluate("(if false 1 2)", env), 2);
		assert.equal(evaluate("(if (nil? nil) 1 2)", env), 1);
		assert.equal(evaluate("(if (nil? 4) 1 2)", env), 2);

		assert.equal(evaluate("(if (= 2 2) (+ 1 2) (- 5 1))", env), 3);
		assert.equal(evaluate("(if (= 1 2) (+ 1 2) (- 5 1))", env), 4);
	});

	it('def', function () {
		evaluate("(def foo 5)", env);
		evaluate('(def bar "test")', env);
		evaluate('(def who foo)', env);
		evaluate('(def pah (+ 3 5))', env);
		assert.equal(evaluate("foo", env), 5);
		assert.equal(evaluate("bar", env), "test");
		assert.equal(evaluate("who", env), 5);
		assert.equal(evaluate("pah", env), 8);
	});

	it('fn', function () {
		evaluate("(fn [x] (* 2 x))", env);
		evaluate("(def identity (fn [x] x))", env);
		evaluate("(def double (fn [x] (* 2 x)))", env);
		evaluate("(def triple (fn [x] (* 3 x)))", env);

		assert.equal(evaluate("(identity 5)", env), 5);
		assert.equal(evaluate("(double 5)", env), 10);
		assert.equal(evaluate("(double 0)", env), 0);
		assert.equal(evaluate("(triple 5)", env), 15);

		assert.equal(evaluate("((if true  double triple) 8)", env), 16);
		assert.equal(evaluate("((if false double triple) 8)", env), 24);
	});

	it('fn bodies', function () {
		assert.equal(evaluate('((fn []))', env), undefined);
		assert.equal(evaluate('((fn [] 12 10))', env), 10);
	});

	it('Apply', function () {
		// assert.equal(evaluate("(apply + '(5 3))", env), 8);
	});

	it('Argument count', function () {
		evaluate("(def double (fn [x] (* 2 x)))", env);
		assert.equal(evaluate("(double 3)", env), 6);
		assert.throws(
			function () {
				evaluate("(double)", env);
			}
		);
		assert.throws(
			function () {
				evaluate("(double 1 2)", env);
			}
		);
	});

	it('Varargs', function () {
		evaluate("(def double (fn [x & xs] (* 2 x)))", env);
		assert.equal(evaluate("(double 3)", env), 6);
		assert.equal(evaluate("(double 7 5 8)", env), 14);

		evaluate("(def count (fn [x & xs] (if (nil? xs) 1 (+ 1 (apply count xs)))))", env);
		assert.equal(evaluate("(count 1)", env), 1);
		assert.equal(evaluate("(count 1 2 3)", env), 3);
	});

	it('Simple Macro', function () {
		evaluate("(def unless (macro [test form] `(if (not ~test) ~form)))", env);
		assert.equal(evaluate("(unless false 1)", env), 1);
		assert.equal(evaluate("(unless true 1)", env), undefined);
	});

	it('Varargs Macro', function () {
		evaluate("(def when (macro [test & body] `(if ~test ((fn [] ~@body)))))", env);
		assert.equal(evaluate("(when true 5 4 3)", env), 3);
		assert.equal(evaluate("(when false 5 4 3)", env), undefined);
	});

	it('Do Macro', function () {
		evaluate("(def do (macro [& body] `((fn [] ~@body))))", env);
		assert.equal(evaluate("(do)", env), undefined);
		assert.equal(evaluate("(do 5)", env), 5);
		assert.equal(evaluate('(do (def name "test") 5)', env), 5);
	});

});

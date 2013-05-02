/*global describe: true, it: true, beforeEach: true */
"use strict";

var assert = require('assert');
var evaluate = require('../src/compiler').evaluate;
var Symbol = require('../src/runtime').Symbol;
var Keyword = require('../src/runtime').Keyword;
var base_environment = require('../src/runtime').base_environment;

describe('compiler', function () {
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
		assert.deepEqual(evaluate("(quote a)", env), new Symbol("a"));
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
	});

	it('Recursive Apply Primitive', function () {
		assert.equal(evaluate("(* (+ 1 2) (/ 10 2))", env), 15);
	});

	it('if', function () {
		assert.equal(evaluate("(if true 1 2)", env), 1);
		assert.equal(evaluate("(if false 1 2)", env), 2);
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
});

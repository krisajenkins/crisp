/*global describe: true, it: true */
"use strict";

var assert = require('assert');
var evaluate = require('../src/compiler').evaluate;
var Symbol = require('../src/runtime').Symbol;
var Keyword = require('../src/runtime').Keyword;
var Environment = require('../src/runtime').Environment;

describe('compiler', function () {
	var env;

	beforeEach(function () {
		env = new Environment();
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
});

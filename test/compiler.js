/*global describe: true, it: true */
"use strict";

var assert = require('assert');
var evaluate = require('../src/compiler').evaluate;
var Symbol = require('../src/runtime').Symbol;
var Keyword = require('../src/runtime').Keyword;

describe('compiler', function () {
	it('Numbers', function () {
		assert.equal(evaluate("123"), 123);
		assert.equal(evaluate("0.34"), 0.34);
		assert.equal(evaluate("-0.34"), -0.34);
	});
	it('Strings', function () {
		assert.equal(evaluate('"test"'), "test");
	});
	it('Quote', function () {
		assert.deepEqual(evaluate("(quote a)"), new Symbol("a"));
		assert.throws(
			function () {
				evaluate("(quote a b)");
			}
		);
	});
	it('apply Primitive', function () {
		assert.equal(evaluate("(+ 1 2)"), 3);
		assert.equal(evaluate("(+ 1 -2 -5)"), -6);
		assert.equal(evaluate("(- 5 2)"), 3);
		assert.equal(evaluate("(- 5 2 1)"), 2);

		assert.equal(evaluate("(= 1 2)"), false);
		assert.equal(evaluate("(= 2 2)"), true);
		assert.equal(evaluate('(= "test" "test")'), true);
		assert.equal(evaluate('(= "test" "toast")'), false);
	});
	it('if', function () {
		assert.equal(evaluate("(if true 1 2)"), 1);
		assert.equal(evaluate("(if false 1 2)"), 2);
		assert.equal(evaluate("(if (= 2 2) (+ 1 2) (- 5 1))"), 3);
		assert.equal(evaluate("(if (= 1 2) (+ 1 2) (- 5 1))"), 4);
	});
});

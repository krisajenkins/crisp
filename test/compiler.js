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
	});
	it('Strings', function () {
		assert.equal(evaluate('"test"'), "test");
	});
	it('Quote', function () {
		console.log("KAJ5", evaluate("(quote a)"));
		assert.deepEqual(evaluate("(quote a)"), new Symbol("a"));
		assert.throws(
			function () {
				evaluate('(quote a b)');
			}
		);
	});
});

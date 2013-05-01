/*global describe: true, it: true */
"use strict";

var assert = require('assert');
var read_string = require('../src/reader').read_string;
var Symbol = require('../src/runtime').Symbol;
var Keyword = require('../src/runtime').Keyword;

describe('reader', function () {
	it('Simple', function () {
		assert.equal(read_string("2").result, 2);
		assert.equal(read_string("2").result, 2);
		assert.equal(read_string("51.13").result, 51.13);
		assert.deepEqual(read_string("somevar").result, new Symbol("somevar"));
		assert.deepEqual(read_string("+").result, new Symbol("+"));
		assert.deepEqual(read_string("list?").result, new Symbol("list?"));
	});
	it('Strings', function () {
		assert.equal(read_string('"test"').result, "test");
	});
	it('Keywords', function () {
		assert.deepEqual(read_string(":a").result, new Keyword("a"));
		assert.deepEqual(read_string(":some-thing").result, new Keyword("some-thing"));
	});
	it('Lists', function () {
		assert.deepEqual(read_string("()").result, []);
		assert.deepEqual(read_string("(1)").result, [1]);
		assert.deepEqual(read_string("( )").result, []);
		assert.deepEqual(
			read_string("(1 a 2 b)").result,
			[1, new Symbol("a"), 2, new Symbol("b")]
		);
	});
	it('Vectors', function () {
		assert.deepEqual(read_string("[]").result, [new Symbol("vec")]);
		assert.deepEqual(read_string("[1]").result, [new Symbol("vec"), 1]);
		assert.deepEqual(read_string("[ ]").result, [new Symbol("vec")]);
		assert.deepEqual(
			read_string("[1 a 2 b]").result,
			[new Symbol("vec"), 1, new Symbol("a"), 2, new Symbol("b")]
		);
	});
	it('Maps', function () {
		assert.deepEqual(read_string("{}").result, [new Symbol("hash-map")]);
		assert.deepEqual(read_string("{a 1 b 2}").result, [new Symbol("hash-map"), new Symbol("a"), 1, new Symbol("b"), 2]);
	});
});

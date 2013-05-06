/*global describe: true, it: true */
"use strict";

var assert = require('assert');
var read_string = require('../lib/reader').read_string;
var Symbol = require('../lib/runtime').Symbol;
var Keyword = require('../lib/runtime').Keyword;

describe('reader', function () {
	it('Numbers', function () {
		assert.equal(read_string("2").result, 2);
		assert.equal(read_string("2").result, 2);
		assert.equal(read_string("-9").result, -9);
		assert.equal(read_string("51.13").result, 51.13);
	});
	it('Symbols', function () {
		assert.deepEqual(read_string("somevar").result, new Symbol("somevar"));
		assert.deepEqual(read_string("+").result, new Symbol("+"));
		assert.deepEqual(read_string("list?").result, new Symbol("list?"));
		assert.deepEqual(read_string("tom.dick_and-harry").result, new Symbol("tom.dick_and-harry"));
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
	it('Quotes', function () {
		assert.deepEqual(
			read_string("'a").result,
			[
				new Symbol("quote"),
				new Symbol("a"),
			]
		);
		assert.deepEqual(
			read_string("'(1 2 3)").result,
			[
				new Symbol("quote"), [1, 2, 3]
			]
		);
	});
	it('Macros', function () {
		assert.deepEqual(
			read_string("`(if ~test (do ~@body))").result,
			[
				new Symbol("syntax-quote"),
				[
					new Symbol("if"),
					[
						new Symbol("unquote"),
						new Symbol("test"),
					],
					[
						new Symbol("do"),
						[
							new Symbol("unquote-splicing"),
							new Symbol("body"),
						],
					],
				],
			]
		);
	});
});

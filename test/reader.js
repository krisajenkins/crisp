/*global describe: true, it: true */
"use strict";

var assert = require('assert');
var read_string = require('../build/reader').read_string;
var Symbol = require('../build/types').Symbol;
var CrispString = require('../build/types').CrispString;
var CrispNumber = require('../build/types').CrispNumber;
var CrispBoolean = require('../build/types').CrispBoolean;
var CrispNumber = require('../build/types').CrispNumber;
var Keyword = require('../build/types').Keyword;
var Vector = require('../build/types').Vector;
var List = require('../build/types').List;

describe('reader', function () {
	it('Numbers', function () {
		assert.deepEqual(read_string("2").result, new CrispNumber(2));
		assert.deepEqual(read_string("2").result, new CrispNumber(2));
		assert.deepEqual(read_string("-9").result, new CrispNumber(-9));
		assert.deepEqual(read_string("51.13").result, new CrispNumber(51.13));
	});
	it('Symbols', function () {
		assert.deepEqual(read_string("somevar").result, new Symbol("somevar"));
		assert.deepEqual(read_string("+").result, new Symbol("+"));
		assert.deepEqual(read_string("list?").result, new Symbol("list?"));
		assert.deepEqual(read_string("tom.dick_&-harry").result, new Symbol("tom.dick_&-harry"));
	});
	it('Boolean', function () {
		assert.deepEqual(read_string("true").result, new CrispBoolean("true"));
		assert.deepEqual(read_string("false").result, new CrispBoolean("false"));
	});
	it('Strings', function () {
		assert.deepEqual(read_string('"test"').result, new CrispString("test"));
	});
	it('Keywords', function () {
		assert.deepEqual(read_string(":a").result, new Keyword("a"));
		assert.deepEqual(read_string(":some-thing").result, new Keyword("some-thing"));
	});
	it('Lists', function () {
		assert.deepEqual(read_string("()").result, new List([]));
		assert.deepEqual(read_string("(1)").result, new List([new CrispNumber(1)]));
		assert.deepEqual(read_string("()").result, new List([]));
		assert.deepEqual(
			read_string("(1 a 2 b)").result,
			new List([new CrispNumber(1), new Symbol("a"), new CrispNumber(2), new Symbol("b")])
		);
	});
	it('Vectors', function () {
		assert.deepEqual(read_string("[]").result, new Vector([]));
		assert.deepEqual(read_string("[ ]").result, new Vector([]));
		assert.deepEqual(read_string("[1]").result, new Vector([new CrispNumber(1)]));
		assert.deepEqual(
			read_string("[1 a 2 b]").result,
			new Vector([new CrispNumber(1), new Symbol("a"), new CrispNumber(2), new Symbol("b")])
		);
	});
	it('Maps', function () {
		assert.deepEqual(read_string("{}").result, [new Symbol("hash-map")]);
		assert.deepEqual(read_string("{a 1 b 2}").result, [new Symbol("hash-map"), new Symbol("a"), new CrispNumber(1), new Symbol("b"), new CrispNumber(2)]);
	});
	it('Quotes', function () {
		assert.deepEqual(
			read_string("'a").result,
			new List([
				new Symbol("quote"),
				new Symbol("a"),
			])
		);
		assert.deepEqual(
			read_string("'(1 2 3)").result,
			new List([new Symbol("quote"), new List([new CrispNumber(1), new CrispNumber(2), new CrispNumber(3)])])
		);
	});
	it('Macros', function () {
		assert.deepEqual(
			read_string("`(if ~test (do ~@body))").result,
			new List([
				new Symbol("syntax-quote"),
				new List([
					new Symbol("if"),
					new List([
						new Symbol("unquote"),
						new Symbol("test"),
					]),
					new List([
						new Symbol("do"),
						new List([
							new Symbol("unquote-splicing"),
							new Symbol("body"),
						]),
					]),
				]),
			])
		);
	});

	it('Comments', function () {
		var one		= read_string("(def a 5) ; A definition\n(def b 6)"),
			two		= read_string(one.remainder),
			three	= read_string(two.remainder),
			four	= read_string(three.remainder),
			five	= read_string(four.remainder);

		assert.equal("COMMENT", read_string("; Some comment").type);

		assert.deepEqual(
			one.result,
			new List([
				new Symbol("def"),
				new Symbol("a"),
				new CrispNumber(5),
			])
		);
		assert.equal(two.type, "WHITESPACE");
		assert.equal(three.type, "COMMENT");
		assert.equal(four.type, "WHITESPACE");
		assert.deepEqual(
			five.result,
			new List([
				new Symbol("def"),
				new Symbol("b"),
				new CrispNumber(6),
			])
		);
	});
});

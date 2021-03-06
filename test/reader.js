/*global describe: true, it: true */
"use strict";

var assert = require('assert');
var read_string = require('../build/reader').read_string;
var Symbol = require('../build/types').Symbol;
var Keyword = require('../build/types').Keyword;
var List = require('../build/types').List;
var assertEq = require('./testutils').assertEq;

// TODO What should "5.5.5" read to?
// TODO Escapes in strings.
// TODO Foreign chars.

describe('reader', function () {
	it('Numbers', function () {
		assert.deepEqual(read_string("2").result, 2);
		assert.deepEqual(read_string("2").result, 2);
		assert.deepEqual(read_string("-9").result, -9);
		assert.deepEqual(read_string("51.13").result, 51.13);
	});
	it('Symbols', function () {
		assert.deepEqual(read_string("somevar").result, new Symbol("somevar"));
		assert.deepEqual(read_string("+").result, new Symbol("+"));
		assert.deepEqual(read_string("list?").result, new Symbol("list?"));
		assert.deepEqual(read_string("<tom.dick_&-harry>").result, new Symbol("<tom.dick_&-harry>"));
	});
	it('Boolean', function () {
		assert.deepEqual(read_string("true").result, true);
		assert.deepEqual(read_string("false").result, false);
	});
	it('Strings', function () {
		assert.deepEqual(read_string('"test"').result, "test");
		assert.deepEqual(read_string('"test\\nthing"').result, "test\nthing");
		assert.deepEqual(read_string('"test\\tthing"').result, "test\tthing");
		assert.deepEqual(read_string('"test\\"thing"').result, 'test"thing');
		assert.deepEqual(read_string('"test(some)thing"').result, 'test(some)thing');
		assert.deepEqual(read_string('"test[some]thing"').result, 'test[some]thing');
	});
	it('Keywords', function () {
		assert.deepEqual(read_string(":a").result, new Keyword("a"));
		assert.deepEqual(read_string(":some-thing").result, new Keyword("some-thing"));
	});
	it('Lists', function () {
		assert.deepEqual(read_string("()").result, new List([]));
		assert.deepEqual(read_string("(1)").result, new List([1]));
		assert.deepEqual(read_string("()").result, new List([]));
		assert.deepEqual(
			read_string("(1 a 2 b)").result,
			new List([1, new Symbol("a"), 2, new Symbol("b")])
		);
	});
	it('Arrays', function () {
		assert.deepEqual(read_string("[]").result, []);
		assert.deepEqual(read_string("[ ]").result, []);
		assert.deepEqual(read_string("[1]").result, [1]);
		assert.deepEqual(
			read_string("[1 a 2 b]").result,
			[1, new Symbol("a"), 2, new Symbol("b")]
		);
	});
	it('Maps', function () {
		assertEq(read_string("{}").result, new List([new Symbol("crisp.types.HashMap.")]));
		assertEq(read_string("{a 1 :b 2}").result, new List([new Symbol("crisp.types.HashMap."), new Symbol("a"), 1, new Keyword("b"), 2]));
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
			new List([new Symbol("quote"), new List([1, 2, 3])])
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
				5,
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
				6,
			])
		);
	});

	it('Regexps', function () {
		assert.deepEqual(
			read_string('#"[aeiou]"').result,
			new List([
				new Symbol("RegExp."),
				"[aeiou]",
			])
		);
		assert.deepEqual(
			read_string('#"a\\[c\\]e"').result,
			new List([
				new Symbol("RegExp."),
				"a\\[c\\]e"
			])
		);
		assert.deepEqual(
			read_string('#"a\\(c\\)e"').result,
			new List([
				new Symbol("RegExp."),
				"a\\(c\\)e"
			])
		);
		assert.deepEqual(
			read_string('#"\\s+\\w"').result,
			new List([
				new Symbol("RegExp."),
				"\\s+\\w",
			])
		);
	});
});

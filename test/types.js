/*global describe: true, it: true */
"use strict";

var assert = require('assert');
var Symbol = require('../lib/types').Symbol;
var CrispString = require('../lib/types').CrispString;
var Keyword = require('../lib/types').Keyword;
var Vector = require('../lib/types').Vector;
var List = require('../lib/types').List;
var equal = require('../lib/runtime').equal;

describe('Equality', function () {
	it('Keyword Equality', function () {
		assert.equal(true, equal(new Keyword("a"), new Keyword("a")));
		assert.equal(false, equal(new Keyword("a"), new Keyword("b")));
		assert.equal(false, equal(new Keyword("a"), undefined));
		assert.equal(false, equal(undefined, new Keyword("b")));
	});
	it('CrispString Equality', function () {
		assert.equal(true, equal(new CrispString("a"), new CrispString("a")));
		assert.equal(false, equal(new CrispString("a"), new CrispString("b")));
		assert.equal(false, equal(new CrispString("a"), undefined));
		assert.equal(false, equal(undefined, new CrispString("b")));
	});
	it('Symbol Equality', function () {
		assert.equal(true, equal(new Symbol("a"), new Symbol("a")));
		assert.equal(false, equal(new Symbol("a"), new Symbol("b")));
		assert.equal(false, equal(new Symbol("a"), undefined));
		assert.equal(false, equal(undefined, new Symbol("b")));
	});
	it('List Equality', function () {
		assert.equal(true, equal(new List([]), new List([])));
		assert.equal(true, equal(new List([1]), new List([1])));
		assert.equal(
			true,
			equal(
				new List([1, new Symbol("test"), new Keyword("toast")]),
				new List([1, new Symbol("test"), new Keyword("toast")])
			)
		);
		assert.equal(false, equal(new List([]), undefined));
		assert.equal(false, equal(undefined, new List([])));
		assert.equal(
			false,
			equal(
				new List([1, new Symbol("tast"), new Keyword("toast")]),
				new List([1, new Symbol("test"), new Keyword("toast")])
			)
		);
	});
	it('Vector Equality', function () {
		assert.equal(true, equal(new Vector([]), new Vector([])));
		assert.equal(true, equal(new Vector([1]), new Vector([1])));
		assert.equal(
			true,
			equal(
				new Vector([1, new Symbol("test"), new Keyword("toast")]),
				new Vector([1, new Symbol("test"), new Keyword("toast")])
			)
		);
		assert.equal(false, equal(new Vector([]), undefined));
		assert.equal(false, equal(undefined, new Vector([])));
		assert.equal(
			false,
			equal(
				new Vector([1, new Symbol("tast"), new Keyword("toast")]),
				new Vector([1, new Symbol("test"), new Keyword("toast")])
			)
		);
	});
});
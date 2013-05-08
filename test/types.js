/*global describe: true, it: true */
"use strict";

var assert = require('assert');
var Symbol = require('../lib/types').Symbol;
var Keyword = require('../lib/types').Keyword;
var Vector = require('../lib/types').Vector;
var equal = require('../lib/runtime').equal;

describe('Equality', function () {
	it('Keyword Equality', function () {
		assert.equal(true, equal(new Keyword("a"), new Keyword("a")));
		assert.equal(false, equal(new Keyword("a"), new Keyword("b")));
		assert.equal(false, equal(new Keyword("a"), undefined));
		assert.equal(false, equal(undefined, new Keyword("b")));
	});
	it('Symbol Equality', function () {
		assert.equal(true, equal(new Symbol("a"), new Symbol("a")));
		assert.equal(false, equal(new Symbol("a"), new Symbol("b")));
		assert.equal(false, equal(new Symbol("a"), undefined));
		assert.equal(false, equal(undefined, new Symbol("b")));
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

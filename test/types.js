/*global describe: true, it: true */
"use strict";

var assert		= require('assert');

var Symbol		= require('../build/types').Symbol;
var CrispString = require('../build/types').CrispString;
var CrispNumber = require('../build/types').CrispNumber;
var Keyword		= require('../build/types').Keyword;
var Vector		= require('../build/types').Vector;
var List		= require('../build/types').List;

var equal		= require('../build/runtime').equal;

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

	it('List manipulation', function () {
		var a = new List([1, 2, 3]),
			b = new List([4, 5, 6]);
		assert.deepEqual(
			a.cons(b),
			new List([new List([4, 5, 6]), 1, 2, 3])
		);
		assert.deepEqual(
			a.concat(b),
			new List([1, 2, 3, 4, 5, 6])
		);
	});

	it('Vector manipulation', function () {
		var a = new Vector([1, 2, 3]),
			b = new Vector([4, 5, 6]);
		assert.deepEqual(
			a.cons(b),
			new Vector([new Vector([4, 5, 6]), 1, 2, 3])
		);
		assert.deepEqual(
			a.concat(b),
			new Vector([1, 2, 3, 4, 5, 6])
		);

		assert.deepEqual(a.drop(0), a);
		assert.deepEqual(a.drop(1), new Vector([ 2, 3]));
		assert.deepEqual(a.drop(10), new Vector([]));

		assert.deepEqual(a.take(0), new Vector([]));
		assert.deepEqual(a.take(1), new Vector([1]));
		assert.deepEqual(a.take(10), a);
	});

	it('Vector searching', function () {
		var a = new Vector([new CrispNumber(1), new Symbol("&"), new Keyword("test")]);

		assert.equal(0, a.indexOf(new CrispNumber(1)));
		assert.equal(1, a.indexOf(new Symbol("&")));
		assert.equal(2, a.indexOf(new Keyword("test")));

		assert.equal(-1, a.indexOf("NOT THERE"));
	});
});

/*global describe: true, it: true */
"use strict";

var assert		= require('assert');

var crisp		= require('../build/crisp');
var Symbol		= crisp.types.Symbol;
var Cons		= crisp.types.Cons;
var CrispString = crisp.types.CrispString;
var CrispNumber = crisp.types.CrispNumber;
var Keyword		= crisp.types.Keyword;
var Vector		= crisp.types.Vector;
var List		= crisp.types.List;
var is_seq		= crisp.types.is_seq;
var seq			= crisp.types.seq;
var first		= crisp.types.first;
var rest		= crisp.types.rest;
var next		= crisp.types.next;

var equal		= crisp.core.equal;
var format		= crisp.core.format;

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

	it('Seq misc.', function () {
		assert.deepEqual(undefined, seq(undefined));
		assert.deepEqual(new List([1]), seq(new List([1])));
		assert.deepEqual(undefined, first(undefined));
		assert.deepEqual(List.EMPTY, rest(undefined));
		assert.deepEqual(undefined, first(List.EMPTY));
		assert.deepEqual(List.EMPTY, rest(List.EMPTY));
	});

	it('List Seq', function () {
		var aseq = new List([1, 2, 3]);

		assert.deepEqual(true, is_seq(aseq));
		assert.deepEqual(aseq, seq(aseq));
		assert.deepEqual(1, first(aseq));
		assert.deepEqual(new List([2, 3]), rest(aseq));
		assert.deepEqual(new List([2, 3]), next(aseq));

		assert.deepEqual(true, is_seq(List.EMPTY));
		assert.deepEqual(undefined, seq(List.EMPTY));
		assert.deepEqual(undefined, first(List.EMPTY));
		assert.deepEqual(List.EMPTY, rest(List.EMPTY));
		assert.deepEqual(undefined, next(List.EMPTY));
	});

	it('Vector Seq', function () {
		var aseq = new Vector([1, 2, 3]);

		assert.deepEqual(true, is_seq(aseq));
		assert.deepEqual(aseq, seq(aseq));
		assert.deepEqual(1, first(aseq));
		assert.deepEqual(new Vector([2, 3]), rest(aseq));
		assert.deepEqual(new Vector([2, 3]), next(aseq));

		assert.deepEqual(true, is_seq(Vector.EMPTY));
		assert.deepEqual(undefined, seq(Vector.EMPTY));
		assert.deepEqual(undefined, first(Vector.EMPTY));
		assert.deepEqual(List.EMPTY, rest(Vector.EMPTY));
		assert.deepEqual(undefined, next(Vector.EMPTY));
	});

	it('Cons Seq', function () {
		var aseq = new Cons(1, new List([2, 3]));

		assert.deepEqual(true, is_seq(aseq));
		assert.deepEqual(aseq, seq(aseq));
		assert.deepEqual(1, first(aseq));
		assert.deepEqual(new List([2, 3]), rest(aseq));
		assert.deepEqual(new List([2, 3]), next(aseq));

		assert.deepEqual(undefined, first(new Cons(undefined, List.EMPTY)));
		assert.deepEqual(List.EMPTY, rest(new Cons(undefined, List.EMPTY)));
		assert.deepEqual(undefined, first(new Cons(undefined, undefined)));
		assert.deepEqual(List.EMPTY, rest(new Cons(undefined, undefined)));
	});
});

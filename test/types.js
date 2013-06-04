/*global describe: true, it: true */
"use strict";

var assert		= require('assert');

var crisp		= require('../build/crisp');
var Symbol		= crisp.types.Symbol;
var Cons		= crisp.types.Cons;
var Keyword		= crisp.types.Keyword;
var List		= crisp.types.List;
var is_seq		= crisp.types.is_seq;
var is_array	= crisp.types.is_array;
var seq			= crisp.types.seq;
var first		= crisp.types.first;
var rest		= crisp.types.rest;
var next		= crisp.types.next;
var count		= crisp.types.count;
var splice		= crisp.types.splice;
var index_of	= crisp.types.index_of;
var range		= crisp.core.range;
var assertEq	= require('./testutils').assertEq;

var equal		= crisp.core.equal;
var format		= crisp.core.format;

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

	it('Seq searching', function () {
		var a = [1, new Symbol("&"), new Keyword("test")];

		assert.equal(0, index_of(1, a));
		assert.equal(1, index_of(new Symbol("&"), a));
		assert.equal(2, index_of(new Keyword("test"), a));

		assert.equal(-1, index_of("NOT THERE", a));
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
		assert.deepEqual(3, count(aseq));

		assert.deepEqual(true, is_seq(List.EMPTY));
		assert.deepEqual(undefined, seq(List.EMPTY));
		assert.deepEqual(undefined, first(List.EMPTY));
		assert.deepEqual(List.EMPTY, rest(List.EMPTY));
		assert.deepEqual(undefined, next(List.EMPTY));
		assert.deepEqual(0, count(List.EMPTY));
	});

	it('Array Seq', function () {
		var aseq = [1, 2, 3];

		assert.deepEqual(true, is_seq(aseq));
		assert.deepEqual(aseq, seq(aseq));
		assert.deepEqual(1, first(aseq));
		assert.deepEqual([2, 3], rest(aseq));
		assert.deepEqual([2, 3], next(aseq));
		assert.deepEqual(3, count(aseq));

		assert.deepEqual(true, is_seq(Array.EMPTY));
		assert.deepEqual(undefined, seq(Array.EMPTY));
		assert.deepEqual(undefined, first(Array.EMPTY));
		assert.deepEqual(List.EMPTY, rest(Array.EMPTY));
		assert.deepEqual(undefined, next(Array.EMPTY));
		assert.deepEqual(0, count(Array.EMPTY));
	});

	it('Array Seq', function () {
		var aseq = [1, 2, 3];

		assert.deepEqual(true, is_seq(aseq));
		assert.deepEqual(aseq, seq(aseq));
		assert.deepEqual(1, first(aseq));
		assert.deepEqual([2, 3], rest(aseq));
		assert.deepEqual([2, 3], next(aseq));
		assert.deepEqual(3, count(aseq));

		assert.deepEqual(true, is_seq(Array.EMPTY));
		assert.deepEqual(undefined, seq(Array.EMPTY));
		assert.deepEqual(undefined, first(Array.EMPTY));
		assert.deepEqual(List.EMPTY, rest(Array.EMPTY));
		assert.deepEqual(undefined, next(Array.EMPTY));
		assert.deepEqual(0, count(Array.EMPTY));
	});

	it('Cons Seq', function () {
		var aseq = new Cons(1, new List([2, 3]));

		assert.deepEqual(true, is_seq(aseq));
		assert.deepEqual(aseq, seq(aseq));
		assert.deepEqual(1, first(aseq));
		assert.deepEqual(new List([2, 3]), rest(aseq));
		assert.deepEqual(new List([2, 3]), next(aseq));
		assert.deepEqual(3, count(aseq));

		assert.deepEqual(undefined, first(new Cons(undefined, List.EMPTY)));
		assert.deepEqual(List.EMPTY, rest(new Cons(undefined, List.EMPTY)));
		assert.deepEqual(undefined, first(new Cons(undefined, undefined)));
		assert.deepEqual(List.EMPTY, rest(new Cons(undefined, undefined)));
		assert.deepEqual(1, count(new Cons(undefined, undefined)));
	});

	it('LazySeq, simple', function () {
		var aseq = range(5);
		assert.equal(true, aseq instanceof crisp.types.LazySeq);

		assert.deepEqual(true, is_seq(aseq));

		assert.deepEqual(5, first(aseq));
		assert.deepEqual(6, first(rest(aseq)));
		assert.deepEqual(6, first(next(aseq)));
	});

	it('Sequence equality', function () {
		assertEq(
			new List([1, 2]),
			new Cons(1, new Cons(2, List.EMPTY))
		);
		assertEq(
			[1, 2],
			new Cons(1, new Cons(2, List.EMPTY))
		);
	});

	it('Splice', function () {
		assertEq(
			splice(
				new List([1, 2, 3]),
				new Cons(4, new Cons(5, List.EMPTY))
			),
			new List([1, 2, 3, 4, 5])
		);
		assertEq(
			splice(
				[1, 2, 3],
				new Cons(4, new Cons(5, List.EMPTY))
			),
			new List([1, 2, 3, 4, 5])
		);
	});

	it('Type tests.', function () {
		assert.equal(true, is_array([]));
		assert.equal(false, is_array(list(1, 2, 3)));
		assert.equal(false, is_array(undefined));
	});
});

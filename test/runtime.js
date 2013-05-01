/*global describe: true, it: true */
"use strict";

var assert = require('assert');
var equal = require('../src/runtime').equal;
var Symbol = require('../src/runtime').Symbol;
var Keyword = require('../src/runtime').Keyword;

describe('runtime', function () {
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
	it('undefined Equality', function () {
		assert.equal(true, equal(undefined, undefined));
	});
});

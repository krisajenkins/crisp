/*global describe: true, it: true */
"use strict";

var assert = require('assert');
var equal = require('../build/runtime').equal;

describe('Equality', function () {
	it('undefined Equality', function () {
		assert.equal(true, equal(undefined, undefined));
	});
});

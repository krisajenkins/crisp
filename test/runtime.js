/*global describe: true, it: true */
"use strict";

var assert = require('assert');
var equal = require('../build/runtime').equal;
var Environment = require('../build/runtime').Environment;

describe('Equality', function () {
	it('undefined Equality', function () {
		assert.equal(true, equal(undefined, undefined));
	});
});

describe('Environment', function () {
	it('extends', function () {
		var env_0 = new Environment(),
			env_1 = env_0.extend(),
			env_2 = env_1.extend();

		env_0.a = 1;
		env_0.b = 2;
		env_1.b = 3;
		env_1.c = 4;
		env_2.c = 5;
		env_2.d = 6;

		assert.equal(1, env_0.a);
		assert.equal(2, env_0.b);
		assert.equal(undefined, env_0.c);
		assert.equal(undefined, env_0.d);

		assert.equal(1, env_1.a);
		assert.equal(3, env_1.b);
		assert.equal(4, env_1.c);
		assert.equal(undefined, env_1.d);

		assert.equal(1, env_2.a);
		assert.equal(3, env_2.b);
		assert.equal(5, env_2.c);
		assert.equal(6, env_2.d);
	});
});

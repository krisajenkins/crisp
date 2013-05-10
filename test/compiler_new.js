
/*global describe: true, it: true, beforeEach: true */
"use strict";

var vm = require('vm');
var format = require('util').format;
var assert = require('assert');

var Symbol = require('../lib/types').Symbol;
var CrispString = require('../lib/types').CrispString;
var CrispBoolean = require('../lib/types').CrispBoolean;
var Keyword = require('../lib/types').Keyword;
var Vector = require('../lib/types').Vector;
var List = require('../lib/types').List;

var compile_string;
var compile_string = require('../lib/compiler').compile_string;
var base_environment = require('../lib/compiler').base_environment;

var runIn = function (source, debug, env) {
	var compiled, result;

	compiled = compile_string(source, env);

	if (typeof debug !== "undefined" && debug !== false) {
		console.log("\n====");
		console.log(compiled);
		console.log("====\n");
	}

	try {
		result = vm.runInNewContext(compiled, env);
	} catch (e) {
		throw e;
	}

	return result;
};

var compilesTo = function (source, expected, env, message) {
	var result = runIn(source, false, env);
	assert.deepEqual(result, expected, message);
};

describe('compiler', function () {
	var env;

	beforeEach(function () {
		env = base_environment.extend();
		env.require = require;
	});

	it('Numbers', function () {
		compilesTo("123", 123, env);
		compilesTo("0.34", 0.34, env);
		compilesTo("-0.34", -0.34, env);
	});
});

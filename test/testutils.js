"use strict";

var assert = require('assert');
var crisp = require('../build/crisp');

var assertEq = function (result, expected, message) {
	if (message === undefined) {
		message = "Not equal:";
	}

	assert.equal(
		true,
		crisp.types.equal(result, expected),
		crisp.core.format(
			"%s %s %s",
			message,
			crisp.core.inspect(result, {depth: null}),
			crisp.core.inspect(expected, {depth: null})
		)
	);
};
exports.assertEq = assertEq;

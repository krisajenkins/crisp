"use strict";

exports.types = require('./types');
exports.core = require('./core');

Array.prototype.count = function () {
	return this.length;
};
Array.prototype.first = function () {
	return this[0];
};
Array.prototype.rest = function () {
	return this.slice(1);
};

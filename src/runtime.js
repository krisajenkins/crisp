"use strict";

var Symbol = function (name) {
	this.name = name;
};
Symbol.prototype.type = "crisp.runtime/symbol";
Symbol.equal = function(x, y) {
	return (x.prototype.type === y.prototype.type)
		&&
		(x.name === y.name);
};
exports.Symbol = Symbol;

var Keyword = function (name) {
	this.name = name;
};
Keyword.prototype.type = "crisp.runtime/keyword";
Keyword.equal = function(x, y) {
	return (x.prototype.type === y.prototype.type)
		&&
		(x.name === y.name);
};
exports.Keyword = Keyword;

var equal = function equal(x, y) {
	if (x.equal) {
		return x.equal(y);
	}

	if (y.equal) {
		return y.equal(x);
	}

	throw "Cannot determine equality for objects " + x + " and " + y;
};

exports.equal = equal;

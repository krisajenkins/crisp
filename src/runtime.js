"use strict";

var Symbol = function (name) {
	this.name = name;
};
Symbol.prototype.type = "crisp.runtime/symbol";
Symbol.prototype.equal = function(x, y) {
	return (x.type === y.type)
		&&
		(x.name === y.name);
};
Symbol.prototype.toString = function () {
	return "[Symbol {name: " + this.name + "}]";
};
exports.Symbol = Symbol;

var Keyword = function (name) {
	this.name = name;
};
Keyword.prototype.type = "crisp.runtime/keyword";
Keyword.prototype.equal = function(x, y) {
	return (x.type === y.type)
		&&
		(x.name === y.name);
};
Keyword.prototype.toString = function () {
	return "[Keyword {name: " + this.name + "}]";
};
exports.Keyword = Keyword;

var equal = function equal(x, y) {
	if (typeof(x) === 'undefined') {
		return typeof(y) === 'undefined';
	}
	if (typeof(y) === 'undefined') {
		return false;
	}
	
	if (x.equal) {
		return x.equal(x,y);
	}

	if (y.equal) {
		return y.equal(y,x);
	}

	throw "Cannot determine equality for objects " + x + " and " + y;
};

exports.equal = equal;

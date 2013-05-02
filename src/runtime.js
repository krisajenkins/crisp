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

	if (typeof(x) === typeof(y)) {
		return x === y;
	}

	throw "Cannot determine equality for objects " + x + " and " + y;
};

exports.equal = equal;

var Environment = function () {
};
Environment.prototype.nil = void(0);
Environment.prototype.true = true;
Environment.prototype.false = false;
Environment.prototype["+"] = function () {
	var result = 0, i;
	for (i = 0; i < arguments.length; i++) {
		result += arguments[i];
	}
	return result;
};
Environment.prototype["-"] = function (head) {
	if (typeof(head) === 'undefined') {
		return 0;
	}

	var result = head, i;
	
	for (i = 1; i < arguments.length; i++) {
		result -= arguments[i];
	}
	return result;
};
Environment.prototype["*"] = function (head) {
	if (typeof(head) === 'undefined') {
		return 0;
	}

	var result = head, i;
	
	for (i = 1; i < arguments.length; i++) {
		result *= arguments[i];
	}
	return result;
};
Environment.prototype["/"] = function (head) {
	if (typeof(head) === 'undefined') {
		return 0;
	}

	var result = head, i;
	
	for (i = 1; i < arguments.length; i++) {
		result /= arguments[i];
	}
	return result;
};
Environment.prototype["="] = equal;

// Environment.prototype.extend = function () {
// 	console.log("Extending environment.");
// 	return new this.constructor();
// };
exports.Environment = Environment;

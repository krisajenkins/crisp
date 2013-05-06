"use strict";

var Symbol = function (name) {
	this.name = name;
};
exports.Symbol = Symbol;
Symbol.prototype.type = "crisp.types/symbol";
Symbol.prototype.equal = function (x, y) {
	return (x.type === y.type)
		&&
		(x.name === y.name);
};
Symbol.prototype.toString = function () {
	return "#" + this.name;
};

var Keyword = function (name) {
	this.name = name;
};
exports.Keyword = Keyword;
Keyword.prototype.type = "crisp.types/keyword";
Keyword.prototype.equal = function (x, y) {
	return (x.type === y.type)
		&&
		(x.name === y.name);
};
Keyword.prototype.toString = function () {
	return ":" + this.name;
};

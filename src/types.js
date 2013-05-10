/* jslint indent: 0 */
// START
"use strict";

var equal = require("deep-equal");
var format = require("util").format;

var CrispBoolean = function (value) {
	this.type = "CrispBoolean";
	this.value = value;
	return this;
};

CrispBoolean.prototype.type = "crisp.types/boolean";

CrispBoolean.prototype.equal = function (other) {
	return ((this.type === other.type) && (this.value === other.value));
};

CrispBoolean.prototype.toString = function () {
	return this.value;
};

CrispBoolean.prototype.toQuote = function () {
	return ("new CrispBoolean(" + this.value + ")");
};

exports.CrispBoolean = CrispBoolean;

var CrispNumber = function (value) {
	this.type = "CrispNumber";
	this.value = value;
	return this;
};

CrispNumber.prototype.type = "crisp.types/number";

CrispNumber.prototype.equal = function (other) {
	return ((this.type === other.type) && (this.value === other.value));
};

CrispNumber.prototype.toQuote = function () {
	return "new CrispNumber('" + this.value + "')";
};

CrispNumber.prototype.toString = function () {
	return this.value.toString();
};

exports.CrispNumber = CrispNumber;

var CrispString = function (value) {
	this.type = "CrispString";
	this.value = value;
	return this;
};

CrispString.prototype.type = "crisp.types/string";

CrispString.prototype.equal = function (other) {
	return ((this.type === other.type) && (this.value === other.value));
};

CrispString.prototype.toString = function () {
	return format("%j", this.value);
};

CrispString.prototype.toQuote = function () {
	return ("new CrispString('" + this.value + "')");
};

exports.CrispString = CrispString;

var Symbol = function (name) {
	this.type = "Symbol";
	this.name = name;
	return this;
};

Symbol.prototype.type = "crisp.types/symbol";

Symbol.prototype.equal = function (other) {
	return ((this.type === other.type) && (this.name === other.name));
};

Symbol.prototype.toQuote = function () {
	return ("new Symbol('" + this.name + "')");
};

Symbol.prototype.toString = function () {
	return this.name;
};

exports.Symbol = Symbol;

var Keyword = function (name) {
	this.name = name;
	return this;
};

Keyword.prototype.type = "crisp.types/keyword";

Keyword.prototype.equal = function (other) {
	return ((this.type === other.type) && (this.name === other.name));
};

Keyword.prototype.toQuote = function () {
	return ("new Keyword('" + this.name + "')");
};

Keyword.prototype.toString = function () {
	return format("%j", ":" + this.value);
};

exports.Keyword = Keyword;

var List = function (items) {
	this.type = "List";
	this.items = items;
	return this;
};

List.prototype.type = "crisp.types/list";

List.prototype.cons = function (item) {
	return new List([item].concat(this.items));
};
List.prototype.join = function (separator) {
	return this.items.join(separator);
};
List.prototype.map = function (f) {
	return new List(this.items.map(f));
};
List.prototype.count = function () {
	return this.items.length;
};
List.prototype.first = function () {
	if (this.items.length > 0) {
		return this.items[0];
	}
};
List.prototype.second = function () {
	if (this.items.length > 1) {
		return this.items[1];
	}
};
List.prototype.third = function () {
	if (this.items.length > 2) {
		return this.items[2];
	}
};
List.prototype.fourth = function () {
	if (this.items.length > 3) {
		return this.items[3];
	}
};
List.prototype.nth = function (n) {
	return this.items[n];
};
List.prototype.rest = function () {
	return new List(this.items.slice(1));
};

List.prototype.next = function () {
	// TODO This is wrong.
	return new List(this.items.slice(1));
};

List.prototype.equal = function (other) {
	return ((this.type === other.type) && equal(this.items,other.items));
};

List.prototype.toQuote = function () {
	return format("new List([%s])", this.items.map(function (x) { return x.toQuote(); }).join(", "));
};

List.prototype.toString = function () {
	return format("[%s]", this.items.map(function (x) { return x.toString(); }).join(", "));
};

exports.List = List;

var Vector = function (items) {
	this.type = "Vector";
	this.items = items;
	return this;
};

Vector.prototype.type = "crisp.types/vector";

Vector.prototype.slice = function () {
	this.items.slice(arguments);
};
Vector.prototype.first = function () {
	if (this.items.length > 0) {
		return this.items[0];
	}
};
Vector.prototype.count = function () {
	return this.items.length;
};
Vector.prototype.nth = function (n) {
	return this.items[n];
};
Vector.prototype.join = function (separator) {
	return this.items.join(separator);
};
Vector.prototype.map = function (f) {
	return new Vector(this.items.map(f));
};
Vector.prototype.take = function (n) {
	return new Vector(this.items.slice(0, n));
};
Vector.prototype.drop = function (n) {
	return new Vector(this.items.slice(n + 1));
};
Vector.prototype.equal = function (other) {
	return ((this.type === other.type) && equal(this.items,other.items));
};

Vector.prototype.toQuote = function () {
	return format("new Vector([%s])", this.items.map(function (x) { return x.toQuote(); }).join(", "));
};

Vector.prototype.toString = function () {
	return format("%s", this.items.join(", "));
};

exports.Vector = Vector;

// END
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
List.prototype.concat = function (other) {
	return new List(this.items.concat(other.items));
};
List.prototype.append = function (other) {
	return new List(this.items.concat(other.items));
};
List.prototype.prepend = function (other) {
	return new List(other.items.concat(this.items));
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
	return new Vector(this.items.slice(n));
};
Vector.prototype.rest = function () {
	return new Vector(this.items.slice(1));
};
Vector.prototype.cons = function (item) {
	return new Vector([item].concat(this.items));
};
Vector.prototype.concat = function (other) {
	return new Vector(this.items.concat(other.items));
};
Vector.prototype.prepend = function (other) {
	return new Vector(other.items.concat(this.items));
};
Vector.prototype.append = function (other) {
	return new Vector(this.items.concat(other.items));
};
Vector.prototype.indexOf = function (thing) {
	var i;

	for (i = 0; i < this.items.length; i = i + 1) {
		if (equal(this.items[i], thing)) {
			return i;
		}
	}

	return -1;
};
Vector.prototype.equal = function (other) {
	return ((this.type === other.type) && equal(this.items,other.items));
};
Vector.prototype.toString = function () {
	return format("%s", this.items.join(", "));
};

exports.Vector = Vector;

var is_seq = function (form) {
	return form instanceof List
		||
		form instanceof Vector;
};
exports.is_seq = is_seq;

var head_is = function (form, symbol_name) {
	return form instanceof List
		&&
		(equal(form.first(), new Symbol(symbol_name)));
};
exports.head_is = head_is;

// END

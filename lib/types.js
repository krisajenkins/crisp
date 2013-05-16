/* jslint indent: 0 */
// START
"use strict";

var assert = require("assert");
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
	return this.value.toString();
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
	return this.name.toString();
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

var is_seq = function (form) {
	return form !== undefined
		&&
		typeof form.seq === 'function';
};
exports.is_seq = is_seq;

var List = function (items) {
	this.type = "List";
	this.items = items;
	return this;
};

List.prototype.type = "crisp.types/list";
List.EMPTY = new List([]);
List.prototype.seq = function () {
	if (this.items.length > 0) {
		return this;
	}
};
List.prototype.first = function () {
	if (this.items.length > 0) {
		return this.items[0];
	}

	return undefined;
};
List.prototype.rest = function () {
	if (this.items.length > 0) {
		return new List(this.items.slice(1));
	}

	return List.EMPTY;
};
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
	if (other === undefined) {
		return this;
	}
	if (other.items === undefined) {
		return this;
	}
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
List.prototype.take = function (n) {
	return new List(this.items.slice(0, n));
};
List.prototype.drop = function (n) {
	return new List(this.items.slice(n));
};
List.prototype.equal = function (other) {
	return ((this.type === other.type) && equal(this.items,other.items));
};
List.prototype.toString = function () {
	return format("(%s)", this.items.map(function (x) { return x.toString(); }).join(", "));
};

exports.List = List;

var Vector = function (items) {
	this.type = "Vector";
	this.items = items;
	return this;
};

Vector.prototype.type = "crisp.types/vector";
Vector.EMPTY = new Vector([]);
Vector.prototype.seq = function () {
	if (this.items.length > 0) {
		return this;
	}
};
Vector.prototype.first = function () {
	if (this.items.length > 0) {
		return this.items[0];
	}

	return undefined;
};
Vector.prototype.rest = function () {
	if (this.items.length > 0) {
		return new Vector(this.items.slice(1));
	}

	return Vector.EMPTY;
};
Vector.prototype.slice = function () {
	this.items.slice(arguments);
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
Vector.prototype.first = function () {
	if (this.items.length > 0) {
		return this.items[0];
	}
};
Vector.prototype.second = function () {
	if (this.items.length > 1) {
		return this.items[1];
	}
};
Vector.prototype.equal = function (other) {
	return ((this.type === other.type) && equal(this.items,other.items));
};
Vector.prototype.toString = function () {
	return format("[%s]", this.items.join(", "));
};

exports.Vector = Vector;

var Cons = function (head, aseq) {
	this.type = "Cons";
	this.head = head;
	this.aseq = aseq;
	return this;
};
Cons.prototype.type = "crisp.types/cons";
Cons.prototype.seq = function () {
	return this;
};
Cons.prototype.first = function () {
	return this.head;
};
Cons.prototype.rest = function () {
	if (this.aseq === undefined) {
		return List.EMPTY;
	}

	return this.aseq;
};
Cons.prototype.toString = function () {
	return format("%s %s", this.head, this.aseq);
};
exports.Cons = Cons;

var LazySeq = function (thunk) {
	this.type = "LazySeq";
	this.thunk = thunk;
	return this;
};
LazySeq.prototype.seq = function () {
	if (this.thunk !== undefined) {
		this.value = this.thunk();
		this.thunk = undefined;
	}

	return this.value;
};
exports.LazySeq = LazySeq;

/* NOTES:
   (rest aseq) never returns nil.
   (seq aseq) either returns a seq or nil.
 */

var seq = function (aseq) {
	if (aseq === undefined) {
		return undefined;
	}

	assert.equal(true, is_seq(aseq), "Collection of type " + (typeof aseq) + " does not implement seq.");

	return aseq.seq();
};
exports.seq = seq;
var first = function (aseq) {
	if (aseq === undefined) {
		return undefined;
	}

	aseq = seq(aseq);
	if (aseq === undefined) {
		return undefined;
	}

	return aseq.first();
};
exports.first = first;

var rest = function (aseq) {
	if (aseq === undefined) {
		return List.EMPTY;
	}

	aseq = seq(aseq);
	if (aseq === undefined) {
		return List.EMPTY;
	}

	return aseq.rest();
};
exports.rest = rest;

var next = function (aseq) {
	return seq(rest(aseq));
};
exports.next = next;

var second = function (aseq) {
	return first(rest(aseq));
};
exports.second = second;

var third = function (aseq) {
	return first(rest(rest(aseq)));
};
exports.third = third;

var fourth = function (aseq) {
	return first(rest(rest(rest(aseq))));
};
exports.fourth = fourth;

var head_is = function (form, symbol_name) {
	return form instanceof List
		&&
		(equal(form.first(), new Symbol(symbol_name)));
};
exports.head_is = head_is;

// END

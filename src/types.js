/* jslint indent: 0 */
// START
"use strict";

var assert = require("assert");
var equal = require("deep-equal");
var format = require("util").format;
var inspect = require("util").inspect;

var CrispBoolean = function (value) {
	this.type = "CrispBoolean";
	this.value = value;
	return this;
};

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

Symbol.prototype.equal = function (other) {
	return ((this.type === other.type) && (this.name === other.name));
};

Symbol.prototype.toString = function () {
	return this.name.toString();
};

exports.Symbol = Symbol;

var Keyword = function (name) {
	this.type = "Keyword";
	this.name = name;
	return this;
};

Keyword.prototype.equal = function (other) {
	return ((this.type === other.type) && (this.name === other.name));
};

Keyword.prototype.toString = function () {
	return format("%j", ":" + this.name);
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
};
List.prototype.rest = function () {
	if (this.items.length > 0) {
		return new List(this.items.slice(1));
	}

	return List.EMPTY;
};
// TODO Delete this.
List.prototype.cons = function (head) {
	return new Cons(head, this);
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
Vector.prototype.cons = function (head) {
	return new Cons(head, this);
};
Vector.prototype.first = function () {
	if (this.items.length > 0) {
		return this.items[0];
	}
};
Vector.prototype.equal = function (other) {
	return ((this.type === other.type) && equal(this.items,other.items));
};
Vector.prototype.toString = function () {
	return format("[%s]", this.items.join(", "));
};
exports.Vector = Vector;

Array.prototype.count = function () {
	return this.length;
};
Array.prototype.seq = function () {
	if (this.length > 0) {
		return this;
	}
};
Array.prototype.first = function () {
	if (this.length > 0) {
		return this[0];
	}

	return undefined;
};
Array.prototype.rest = function () {
	if (this.length > 0) {
		return this.slice(1);
	}

	return Vector.EMPTY;
};
Array.EMPTY = [];

var Cons = function (head, tail) {
	assert.equal(2, arguments.length, "new Cons requires two arguments.");
	assert.equal(false, arguments[1] === 'undefined', "Second argument to new Cons may not be nil.");

	this.type = "Cons";
	this.head = head;
	this.tail = tail;
	return this;
};
Cons.prototype.seq = function () {
	return this;
};
var map = function (f, coll) {
	if (coll === undefined) {
		return undefined;
	}
	coll = seq(coll);
	if (coll === undefined) {
		return undefined;
	}

	return cons(
		f(first(coll)),
		map(f, rest(coll))
	);
};
exports.map = map;
Cons.prototype.join = function (separator) {
	if (this.tail === undefined) {
		return this.head;
	}
	if (seq(this.tail) === undefined) {
		return this.head;
	}

	return this.head + separator + this.tail.join(separator);
};
Cons.prototype.map = function (f) {
	return new Cons(f(this.head), map(f, this.tail));
};
Cons.prototype.first = function () {
	return this.head;
};
Cons.prototype.rest = function () {
	if (this.tail === undefined) {
		return List.EMPTY;
	}

	return this.tail;
};
Cons.prototype.count = function () {
	if (this.tail === undefined) {
		return 1;
	}

	return 1 + count(this.tail);
};
Cons.prototype.toString = function () {
	return format("%s %s", this.head, this.tail);
};
exports.Cons = Cons;

var cons = function (head, tail) {
	return new Cons(head, tail);
};
exports.cons = cons;

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
LazySeq.prototype.first = function () {
	if (seq(this.value)) {
		return first(seq(this.value));
	}

	return this.value;
};
LazySeq.prototype.rest = function () {
	if (seq(this.value)) {
		return rest(seq(this.value));
	}

	return List.EMPTY;
};
exports.LazySeq = LazySeq;

var seq = function (aseq) {
	if (aseq === undefined) {
		return undefined;
	}

	assert.equal(
		true,
		is_seq(aseq),
		format(
			"Collection (%s, %s/%s) does not implement seq.",
			aseq,
			typeof aseq,
			aseq.type
		)
	);

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

var count = function (aseq) {
	if (aseq === undefined) {
		return 0;
	}

	aseq = seq(aseq);
	if (aseq === undefined) {
		return 0;
	}

	return aseq.count();
};
exports.count = count;

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
	return (
		form instanceof List
		||
		form instanceof Cons
	)
	&&
	(equal(form.first(), new Symbol(symbol_name)));
};
exports.head_is = head_is;

// END

var Splice = function (seqa, seqb) {
	this.seqa = seqa;
	this.seqb = seqb;
};
Splice.prototype.seq = function () {
	if (seq(this.seqa)) {
		return this;
	}
	if (seq(this.seqb)) {
		return this;
	}
};
Splice.prototype.first = function () {
	if (seq(this.seqa)) {
		return first(this.seqa);
	}
	if (seq(this.seqb)) {
		return first(this.seqb);
	}
};
Splice.prototype.rest = function () {
	if (seq(this.seqa)) {
		return new Splice(rest(this.seqa), this.seqb);
	}

	return rest(this.seqb);
};
exports.Splice = Splice;

var splice = function (seqa, seqb) {
	return new Splice(seqa, seqb);
};
exports.splice = splice;

var index_of = function (x, coll) {
	var loop = function(n, remainder) {
		if (seq(remainder) === undefined) {
			return -1;
		}

		if (equal(first(seq(remainder)), x)) {
			return n;
		}

		return loop(n + 1, rest(seq(remainder)));
	};

	return loop(0, coll);
};
exports.index_of = index_of;

var HashMap = function () {
	assert.equal(0, arguments.length % 2, "Maps require an even number of forms.");
	var i;

	for (i = 0; i < arguments.length; i += 2 ) {
		this[arguments[i]] = arguments[i+1];
	}

	return this;
};
exports.HashMap = HashMap;

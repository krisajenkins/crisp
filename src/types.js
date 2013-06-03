/* jslint indent: 0 */
// START
"use strict";

var assert = require("assert");
var deep_equal = require("deep-equal");
var crisp = require('./crisp');

var Symbol = function (name) {
	this.type = "Symbol";
	this.name = name;
	return this;
};

var seq_equal = function (x, y) {
	if (crisp.types.seq(x) === undefined) {
		return crisp.types.seq(y) === undefined;
	}

	if (crisp.types.seq(y) === undefined) {
		return crisp.types.seq(x) === undefined;
	}

	return equal(crisp.types.first(x), crisp.types.first(y))
		&&
		equal(crisp.types.rest(x), crisp.types.rest(y));
};

var equal = function (x, y) {
	if (x === undefined) {
		return y === undefined;
	}

	if (y === undefined) {
		return x === undefined;
	}

	if (crisp.types.is_seq(x) && crisp.types.is_seq(y)) {
		return seq_equal(x, y);
	}

	return deep_equal(x, y);
};

exports.equal = equal;

Symbol.prototype.equal = function (other) {
	return ((this.type === other.type) && (this.name === other.name));
};

Symbol.prototype.toString = function () {
	var expanded = this.name,
	match = /(.*\.)?(.*)\?$/.exec(expanded);

	if (match) {
		expanded = crisp.core.format("%sis_%s", match[1]||"", match[2]);
	}

	// JavaScript reserved symbols.
	expanded = expanded.replace(/-/g,		"_");
	expanded = expanded.replace(/\*\*/g,	"__");
	expanded = expanded.replace(/\*/g,		"_STAR_");
	expanded = expanded.replace(/!/g,		"_BANG_");
	expanded = expanded.replace(/>/g,		"_GT_");
	expanded = expanded.replace(/</g,		"_LT_");
	expanded = expanded.replace(/=/g,		"_EQ_");

	// JavaScript reserved words.
	expanded = expanded.replace(/^do$/g,	"crisp_do");
	expanded = expanded.replace(/^let$/g,	"crisp_let");

	return expanded;
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
	return crisp.core.format("%j", this.name);
};

exports.Keyword = Keyword;

var is_seq = function (form) {
	return form
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
List.prototype.toArray = function () {
	if (this.items.length > 0) {
		return this.items;
	}

	return Array.EMPTY;
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
	return crisp.core.format("(%s)", this.items.map(function (x) { return x.toString(); }).join(", "));
};

exports.List = List;

// We have to be able to patch difference versions of Array, because
// Array.prototype isn't shared across contexts (like frames or
// node.vm.runInContext). This is sad. Maybe patching Array isn't the
// way to go...
var patch_array_prototype = function (a) {
	a.prototype.count = function () {
		return this.length;
	};
	a.prototype.seq = function () {
		if (this.length > 0) {
			return this;
		}
	};
	a.prototype.first = function () {
		if (this.length > 0) {
			return this[0];
		}
	};
	a.prototype.rest = function () {
		if (this.length > 0) {
			return this.slice(1);
		}

		return a.EMPTY;
	};
	a.prototype.nth = function (n) {
		return this[n];
	};
	a.prototype.take = function (n) {
		return this.slice(0, n);
	};
	a.EMPTY = [];
};
patch_array_prototype(Array);
exports.patch_array_prototype = patch_array_prototype;

var Cons = function (head, tail) {
	assert.equal(2, arguments.length, "new Cons requires two arguments.");
	assert.equal(false, tail === 'undefined', "Second argument to new Cons may not be nil.");

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
Cons.prototype.toArray = function () {
	if (this.tail === undefined) {
		return [this.head];
	}

	var result = into_array(this.tail);
	result.unshift(this.head);
	return result;
};
Cons.prototype.toString = function () {
	return crisp.core.format("%s %s", this.head, this.tail);
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
	if (this.thunk) {
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
LazySeq.prototype.toArray = function () {
	var result = [], iterator = this;

	while (seq(iterator)) {
		result.push(first(iterator));
		iterator = rest(iterator);
	}

	return result;
};
exports.LazySeq = LazySeq;

var seq = function (aseq) {
	if (aseq === undefined) {
		return undefined;
	}

	if (! is_seq(aseq)) {
		throw new Error(
			crisp.core.format(
				"Collection (%s, %s/%s/%s) does not implement seq.",
				aseq,
				typeof aseq,
				aseq.type,
				aseq.constructor
			)
		);
	}

	return aseq.seq();
};
exports.seq = seq;

var into_array = function (aseq) {
	if (aseq === undefined) {
		return [];
	}
	if (aseq instanceof Array) {
		return aseq;
	}

	assert.equal(
		false,
		aseq.toArray === undefined,
		crisp.core.format(
			"Collection (%s, %s/%s/%s) does not implement toArray.",
			aseq,
			typeof aseq,
			aseq.type,
			aseq.constructor
		)
	);

	return aseq.toArray();
};
exports.into_array = into_array;

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

var is_empty = function (aseq) {
	return seq(aseq) === undefined;
}
exports.is_empty = is_empty;

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

var Splice = function (seqa, seqb) {
	assert.equal(true, is_seq(seqa), "First argument to crisp.types.Splice must be a seq. Instead got: " + seqa);
	assert.equal(true, is_seq(seqb), "Second argument to crisp.types.Splice must be a seq. Instead got: " + seqb);

	this.seqa = seqa;
	this.seqb = seqb;
};
Splice.prototype.seq = function () {
	if (seq(this.seqa)) {return this;}
	if (seq(this.seqb)) {return this;}
};
Splice.prototype.first = function () {
	if (seq(this.seqa)) {return first(this.seqa);}
	if (seq(this.seqb)) {return first(this.seqb);}
};
Splice.prototype.rest = function () {
	if (seq(this.seqa)) {
		return new Splice(rest(this.seqa), this.seqb);
	}

	return rest(this.seqb);
};
Splice.prototype.count = function () {
	return count(seq(this.seqa))
		+
		count(seq(this.seqb));
};
Splice.prototype.toArray = function () {
	if (this.seqa) {
		return into_array(this.seqa).concat(into_array(this.seqb));
	}

	if (this.seqb) {
		return into_array(this.seqb);
	}
}
exports.Splice = Splice;

var splice = function (seqa, seqb) {
	if (seqa === undefined) {
		return seqb;
	}

	if (seqb === undefined) {
		return seqa;
	}

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

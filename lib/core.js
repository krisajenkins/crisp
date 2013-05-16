// START
"use strict";

var crisp = require('./crisp');

var format = require("util").format;
exports.format = format;

var defmacro = (function (name, args, body) {
	return new crisp.types.List([]).cons(new crisp.types.List([]).cons(body).cons(args).cons(new crisp.types.Symbol("macro"))).cons(name).cons(new crisp.types.Symbol("def"));
});
defmacro.__metadata__ = {"macro":true};
exports.defmacro = defmacro;

var crisp_do = (function () {
	var body = new crisp.types.List(Array.prototype.slice.call(arguments, 0));
	return new crisp.types.List([]).cons(new crisp.types.List([]).prepend(body).cons(new crisp.types.Vector([])).cons(new crisp.types.Symbol("fn")));
});
crisp_do.__metadata__ = {"macro":true};
exports.crisp_do = crisp_do;

var defn = (function (name, args, body) {
	return new crisp.types.List([]).cons(new crisp.types.List([]).cons(body).cons(args).cons(new crisp.types.Symbol("fn"))).cons(name).cons(new crisp.types.Symbol("def"));
});
defn.__metadata__ = {"macro":true};
exports.defn = defn;

var crisp_let = (function (bindings) {
	var body = new crisp.types.List(Array.prototype.slice.call(arguments, 1));
	return lt(bindings.count(), 1) ? new crisp.types.List([]).cons(new crisp.types.List([]).prepend(body).cons(new crisp.types.Vector([])).cons(new crisp.types.Symbol("fn"))) : new crisp.types.List([]).cons(bindings.second()).cons(new crisp.types.List([]).cons(new crisp.types.List([]).prepend(body).cons(bindings.drop(2)).cons(new crisp.types.Symbol("let"))).cons(new crisp.types.Vector([]).cons(bindings.first())).cons(new crisp.types.Symbol("fn")));
});
crisp_let.__metadata__ = {"macro":true};
exports.crisp_let = crisp_let;

var is_number = (function (x) {
	return equal(typeof x, "number");
});
exports.is_number = is_number;

var is_zero = (function (x) {
	return equal(0, x);
});
exports.is_zero = is_zero;

var is_empty = (function (x) {
	return is_zero(x.count());
});
exports.is_empty = is_empty;

var is_atom = (function (form) {
	return !(form instanceof Array || form instanceof List);
});
exports.is_atom = is_atom;

var is_self_evaluating = (function (form) {
	return (equal(typeof form, "number") || equal(typeof form, "string"));
});
exports.is_self_evaluating = is_self_evaluating;

var inc = (function (x) {
	return (1 + x);
});
exports.inc = inc;

var dec = (function (x) {
	return (1 - x);
});
exports.dec = dec;

// END

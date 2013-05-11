/* jslint indent: 0 */
// START
"use strict";

var assert = require("assert");
var format = require("util").format;
var Keyword = require("./types").Keyword;

var Symbol = require("./types").Symbol;
var Vector = require("./types").Vector;
var List = require("./types").List;

var is_atom = function (form) {
	return !((form instanceof Array)||(form instanceof List)||(form instanceof Vector));
};

exports.is_atom = is_atom;

var is_self_evaluating = function (form) {
	return ((typeof form === "boolean") || (typeof form === "number") || (typeof form === "string"));
};

exports.is_self_evaluating = is_self_evaluating;

var identity = function (x) {
	return x;
};

exports.identity = identity;

var equal = function (x, y) {
	return (typeof x === "undefined") ? (typeof y === "undefined")
		: (typeof y === "undefined") ? false
		: x.equal ? x.equal(y)
		: y.equal ? y.equal(x)
		: (typeof x === typeof y) ? (x === y)
		: (function () { throw "Cannot determine equality for objects " + x + " and " + y; }());
};

exports.equal = equal;

var CrispIf = function (test_form, then_form, else_form) {
	this.test_form = test_form;
	this.then_form = then_form;
	this.else_form = else_form;
	return this;
};

CrispIf.prototype.toString = function () {
	return format(
		"%s ? %s : %s",
		this.test_form,
		this.then_form,
		this.else_form
	);
};

exports.CrispIf = CrispIf;

var CrispDef = function (name, value) {
	this.name = name;
	this.value = value;
	return this;
};

CrispDef.prototype.toString = function () {
	return format(
		"var %s = %s;",
		this.name,
		this.value
	);
};

exports.CrispDef = CrispDef;

var Procedure = function (forms) {
	this.type = "Procedure";
	this.forms = forms;
	return this;
};

Procedure.prototype.toString = function () {
	return format("[ Procedure %s]", this.forms);
};
exports.Procedure = Procedure;

var Lambda = function (args, rest, body, env) {
	this.type = "Lambda";
	this.args = args;
	this.rest = rest;
	this.body = body;
	this.env = env;
	return this;
};

exports.Lambda = Lambda;

var Macro = function (args, rest, body) {
	this.args = args;
	this.rest = rest;
	this.body = body;
	return this;
};

exports.Macro = Macro;

var Environment = function () {
	return ;
};

Environment.prototype.extend = function () {
	var Parent = function () {
		return ;
	};
	Parent.prototype = this;
	return new Parent();
};
Environment.prototype.extend_by = function (callee, args, rest, values) {
	var i,
	sub_env = this.extend();

	if (typeof rest === "undefined") {
		assert.equal(args.length, values.length, "Callee " + callee + " called with the wrong number of arguments, Expected " + args.length + ". Got " + values.length + ".");
	} else {
		assert.equal(true, args.length <= values.length, "Callee " + callee + " called with the wrong number of arguments, Expected " + args.length + "+. Got " + values.length + ".");
	}

	for (i = 0; i < args.length; i = i + 1) {
		sub_env[args[i]] = values[i];
	}
	if (typeof rest !== "undefined") {
		if (values.length > args.length) {
			sub_env[rest] = values.slice(args.length);
		}
	}

	return sub_env;
};

exports.Environment = Environment;

var first = function (x) {
	return x.first();
};

// END

var Quote = function (item) {
	this.type = "Quote";
	this.item = item;
	return this;
};

exports.Quote = Quote;

var SyntaxQuote = function (item) {
	this.type = "SyntaxQuote";
	this.item = item;
	return this;
};

exports.SyntaxQuote = SyntaxQuote;

var Unquote = function (item) {
	this.type = "Unquote";
	this.item = item;
	return this;
};

exports.Unquote = Unquote;

var UnquoteSplicing = function (item) {
	this.type = "UnquoteSplicing";
	this.item = item;
	return this;
};

exports.UnquoteSplicing = UnquoteSplicing;

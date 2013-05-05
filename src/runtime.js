"use strict";

var is_atom = function (form) {
	return !(form instanceof Array);
};
exports.is_atom = is_atom;

var is_self_evaluating = function (form) {
	return typeof(form) === "number"
		||
		typeof(form) === "boolean"
		||
		typeof(form) === "string";
};
exports.is_self_evaluating = is_self_evaluating;

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
	return "#" + this.name;
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
	return ":" + this.name;
};
exports.Keyword = Keyword;

var Lambda = function (args, body, env) {
	this.args = args;
	this.body = body;
	this.env = env;
};
Lambda.prototype.toString = function () {
	return "[ Lambda ]";
};
exports.Lambda = Lambda;

var Macro = function (args, body, env) {
	this.args = args;
	this.body = body;
	this.env = env;
};

Macro.prototype.toString = function () {
	return "[ Macro ]";
};
exports.Macro = Macro;

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

var Environment = function () {};
exports.Environment = Environment;
Environment.prototype.extend = function () {
	var Parent;

	Parent = function () {};
	Parent.prototype = this;

	return new Parent();
};

var base_environment = new Environment();
base_environment[new Symbol("nil")] = void(0);
base_environment[new Symbol("true")] = true;
base_environment[new Symbol("false")] = false;
base_environment[new Symbol("=")] = equal;
base_environment[new Symbol("not")] = function (arg) {
	return ! arg;
};
base_environment[new Symbol("+")] = function () {
	var result = 0, i;
	for (i = 0; i < arguments.length; i++) {
		result += arguments[i];
	}
	return result;
};
base_environment[new Symbol("-")] = function (head) {
	if (typeof(head) === 'undefined') {
		return 0;
	}

	var result = head, i;

	for (i = 1; i < arguments.length; i++) {
		result -= arguments[i];
	}
	return result;
};
base_environment[new Symbol("*")] = function (head) {
	if (typeof(head) === 'undefined') {
		return 0;
	}

	var result = head, i;

	for (i = 1; i < arguments.length; i++) {
		result *= arguments[i];
	}
	return result;
};
base_environment[new Symbol("/")] = function (head) {
	if (typeof(head) === 'undefined') {
		return 0;
	}

	var result = head, i;

	for (i = 1; i < arguments.length; i++) {
		result /= arguments[i];
	}
	return result;
};
base_environment[new Symbol("vec")] = function () {
	return arguments;
}

// Environment.prototype.extend = function () {
// 	console.log("Extending environment.");
// 	return new this.constructor();
// };

exports.base_environment = base_environment;

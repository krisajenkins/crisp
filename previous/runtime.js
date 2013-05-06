/* jslint indent: 0 */
// START
"use strict";

var Keyword = require("./types").Keyword;

var Symbol = require("./types").Symbol;

var is_atom = function (form) {
return !(form instanceof Array);
};

exports.is_atom = is_atom;

var is_self_evaluating = function (form) {
return ((typeof(form) === "boolean") || (typeof(form) === "number") || (typeof(form) === "string"));
};

exports.is_self_evaluating = is_self_evaluating;

var equal = function (x, y) {
return (typeof(x) === "undefined") ? 
(typeof(y) === "undefined")
 : 
(typeof(y) === "undefined") ? 
false
 : 
x.equal ? 
x.equal(x, y)
 : 
y.equal ? 
y.equal(y, x)
 : 
(typeof(x) === typeof(y)) ? 
(x === y)
 : 
(function () { throw "Cannot determine equality for objects " + x + " and " + y; }());
};

exports.equal = equal;

var Lambda = function (args, body, env) {
this.args = args;
this.body = body;
this.env = env;
return this;
};

Lambda.prototype.toString = function () {
return "[ Lambda ]";
};

exports.Lambda = Lambda;

var Macro = function (args, body, env) {
this.args = args;
this.body = body;
this.env = env;
return this;
};

Macro.prototype.toString = function () {
return "[ Macro ]";
};

exports.Macro = Macro;

var Environment = function () {};

Environment.prototype.extend = function () {
var Parent = function () {};
Parent.prototype = this;
return new Parent();
};

exports.Environment = Environment;

// END
/* jslint indent: 0 */
// START
"use strict";

var is_atom = function (form) {
return !(form instanceof Array);
};
exports.is_atom = is_atom;

var is_self_evaluating = function (form) {
return ((typeof(form) === "number") || (typeof(form) === "string"));
};
exports.is_self_evaluating = is_self_evaluating;

var Symbol = function (name) {
return this.name = name;
};
exports.Symbol = Symbol;

Symbol.prototype.type = "crisp.runtime/symbol";

Symbol.prototype.equal = function (x, y) {
return ((x.type === y.type) && (x.name === y.name));
};

Symbol.prototype.toString = function () {
return ("#" + this.name);
};

var Keyword = function (name) {
return this.name = name;
};
exports.Keyword = Keyword;

Keyword.prototype.type = "crisp.runtime/keyword";

Keyword.prototype.equal = function (x, y) {
return ((x.type === y.type) && (x.name === y.name));
};

Keyword.prototype.toString = function () {
return (":" + this.name);
};

var Lambda = function (args, body, env) {
this.args = args;
this.body = body;
return this.env;
};
exports.Lambda = Lambda;

Lambda.prototype.type = "crisp.runtime/lambda";

Lambda.prototype.toString = function () {
return "[ Lambda ]";
};

var equal = function (x, y) {
return (typeof(x) === "undefined") ? 
(typeof(y) === "undefined")
 : 
x.equal ? 
x.equal(x, y)
 : 
y.equal ? 
y.equal(x, y)
 : 
(typeof(x) === typeof(y)) ? 
(x === y)
 : 
(function () { throw "Cannot determine equality for objects " + x + " and " + y; }());
};
exports.equal = equal;

var Environment = function () {};
exports.Environment = Environment;

Environment.prototype.type = "crisp.runtime/environment";

Environment.prototype.extend = function () {
var Parent = function () {};
exports.Parent = Parent;
Parent.prototype = this;
return Parent;
};

// END
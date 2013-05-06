/* jslint indent: 0 */
// START
"use strict";

var Symbol = function (name) {
this.name = name;
return this;
};

Symbol.prototype.type = "crisp.types/symbol";

Symbol.prototype.equal = function (x, y) {
return ((x.type === y.type) && (x.name === y.name));
};

Symbol.prototype.toString = function () {
return ("#" + this.name);
};

exports.Symbol = Symbol;

var Keyword = function (name) {
this.name = name;
return this;
};

Keyword.prototype.type = "crisp.types/keyword";

Keyword.prototype.equal = function (x, y) {
return ((x.type === y.type) && (x.name === y.name));
};

Keyword.prototype.toString = function () {
return (":" + this.name);
};

exports.Keyword = Keyword;

// END
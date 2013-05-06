/* jslint indent: 0 */
// START
"use strict";

var Symbol = function (name) {
this.name = name;
return this;
};

Symbol.prototype.type = "crisp.types/symbol";

Symbol.prototype.equal = function (other) {
return ((this.type === other.type) && (this.name === other.name));
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

Keyword.prototype.equal = function (other) {
return ((this.type === other.type) && (this.name === other.name));
};

Keyword.prototype.toString = function () {
return (":" + this.name);
};

exports.Keyword = Keyword;

// END
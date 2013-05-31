var crisp = require('./crisp');
var format = require('util').format;
exports.format = format;
var inspect = require('util').inspect;
exports.inspect = inspect;
var equal = require('deep-equal');
exports.equal = equal;
var seq = crisp.types.seq;
exports.seq = seq;
var is_seq = crisp.types.is_seq;
exports.is_seq = is_seq;
var first = crisp.types.first;
exports.first = first;
var second = crisp.types.second;
exports.second = second;
var rest = crisp.types.rest;
exports.rest = rest;
var next = crisp.types.next;
exports.next = next;
var count = crisp.types.count;
exports.count = count;
var LazySeq = crisp.types.LazySeq;
exports.LazySeq = LazySeq;
var Cons = crisp.types.Cons;
exports.Cons = Cons;
var defmacro = function (name, args, body) {
	return crisp.types.cons(new crisp.types.Symbol('def'), crisp.types.cons(name, crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('macro'), crisp.types.cons(args, crisp.types.cons(body, undefined))), undefined)));
};
defmacro.__metadata__ = { macro: true };
exports.defmacro = defmacro;
var crisp_do = function () {
	var body = Array.prototype.slice.call(arguments, 0);
	return crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('fn'), crisp.types.cons([], crisp.types.splice(body, undefined))), undefined);
};
crisp_do.__metadata__ = { macro: true };
exports.crisp_do = crisp_do;
var defn = function (name, args) {
	var body = Array.prototype.slice.call(arguments, 2);
	return crisp.types.cons(new crisp.types.Symbol('def'), crisp.types.cons(name, crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('fn'), crisp.types.cons(args, crisp.types.splice(body, undefined))), undefined)));
};
defn.__metadata__ = { macro: true };
exports.defn = defn;
var is_number = function (x) {
	return crisp.core.equal(typeof x, 'number');
};
exports.is_number = is_number;
var is_zero = function (x) {
	return crisp.core.equal(0, x);
};
exports.is_zero = is_zero;
var is_empty = function (x) {
	return is_zero(count(x));
};
exports.is_empty = is_empty;
var is_self_evaluating = function (form) {
	return crisp.core.equal(typeof form, 'number') || crisp.core.equal(typeof form, 'string');
};
exports.is_self_evaluating = is_self_evaluating;
var inc = function (x) {
	return 1 + x;
};
exports.inc = inc;
var dec = function (x) {
	return 1 - x;
};
exports.dec = dec;
var cons = function (head, seq) {
	return new Cons(head, seq);
};
exports.cons = cons;
var lazy_seq = function () {
	var body = Array.prototype.slice.call(arguments, 0);
	return crisp.types.cons(new crisp.types.Symbol('LazySeq.'), crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('fn'), crisp.types.cons([], crisp.types.splice(body, undefined))), undefined));
};
lazy_seq.__metadata__ = { macro: true };
exports.lazy_seq = lazy_seq;
var let_STAR_ = function (bindings) {
	var body = Array.prototype.slice.call(arguments, 1);
	return count(bindings) < 1 ? crisp.types.cons(new crisp.types.Symbol('do'), crisp.types.splice(body, undefined)) : crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('fn'), crisp.types.cons(crisp.types.cons(first(bindings), []), crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('let*'), crisp.types.cons(rest(rest(bindings)), crisp.types.splice(body, undefined))), undefined))), crisp.types.cons(second(bindings), undefined));
};
let_STAR_.__metadata__ = { macro: true };
exports.let_STAR_ = let_STAR_;
var map = function (f, coll) {
	return new LazySeq(function () {
		return seq(coll) ? cons(f(first(coll)), map(f, rest(coll))) : undefined;
	});
};
exports.map = map;
var join = function (coll, string) {
	return first(coll) + (string + join(rest(coll), string));
};
exports.join = join;
var range = function (x) {
	return new LazySeq(function () {
		return cons(x, range(inc(x)));
	});
};
exports.range = range;
var drop = function (n, aseq) {
	return crisp.core.equal(0, n) ? aseq : drop(dec(n), rest(aseq));
};
exports.drop = drop;
var identity = function (x) {
	return x;
};
exports.identity = identity;
var doto = function (x) {
	var forms = Array.prototype.slice.call(arguments, 1);
	return function (gx) {
		return function () {
			return crisp.types.cons(new crisp.types.Symbol('let*'), crisp.types.cons(crisp.types.cons(gx, crisp.types.cons(x, [])), crisp.types.splice(map(function (f) {
				return is_seq(f) ? crisp.types.cons(first(f), crisp.types.cons(gx, crisp.types.splice(next(f), undefined))) : crisp.types.cons(f, crisp.types.cons(gx, undefined));
			}, forms), crisp.types.cons(gx, undefined))));
		}();
	}(new crisp.types.Symbol('G__1'));
};
doto.__metadata__ = { macro: true };
exports.doto = doto;
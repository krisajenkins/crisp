var crisp = require('./crisp');
var format = require('util').format;
exports.format = format;
var inspect = require('util').inspect;
exports.inspect = inspect;
var equal = crisp.types.equal;
exports.equal = equal;
var seq = crisp.types.seq;
exports.seq = seq;
var is_seq = crisp.types.is_seq;
exports.is_seq = is_seq;
var is_array = crisp.types.is_array;
exports.is_array = is_array;
var first = crisp.types.first;
exports.first = first;
var second = crisp.types.second;
exports.second = second;
var third = crisp.types.third;
exports.third = third;
var fourth = crisp.types.fourth;
exports.fourth = fourth;
var rest = crisp.types.rest;
exports.rest = rest;
var next = crisp.types.next;
exports.next = next;
var count = crisp.types.count;
exports.count = count;
var into_array = crisp.types.into_array;
exports.into_array = into_array;
var LazySeq = crisp.types.LazySeq;
exports.LazySeq = LazySeq;
var Cons = crisp.types.Cons;
exports.Cons = Cons;
var Splice = crisp.types.Splice;
exports.Splice = Splice;
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
	return x + 1;
};
exports.inc = inc;
var dec = function (x) {
	return x - 1;
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
		return seq(coll) ? function () {
			return cons(f(first(coll)), map(f, rest(coll)));
		}() : undefined;
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
var __GT_ = function (x, form) {
	var more = Array.prototype.slice.call(arguments, 2);
	return form ? seq(more) ? crisp.types.cons(new crisp.types.Symbol('->'), crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('->'), crisp.types.cons(x, crisp.types.cons(form, undefined))), crisp.types.splice(more, undefined))) : is_seq(form) ? crisp.types.cons(first(form), crisp.types.cons(x, crisp.types.splice(next(form), undefined))) : crisp.types.list(form, x) : x;
};
__GT_.__metadata__ = { macro: true };
exports.__GT_ = __GT_;
var __GT__GT_ = function (x, form) {
	var more = Array.prototype.slice.call(arguments, 2);
	return form ? seq(more) ? crisp.types.cons(new crisp.types.Symbol('->>'), crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('->>'), crisp.types.cons(x, crisp.types.cons(form, undefined))), crisp.types.splice(more, undefined))) : is_seq(form) ? crisp.types.splice(form, crisp.types.cons(x, undefined)) : crisp.types.list(form, x) : x;
};
__GT__GT_.__metadata__ = { macro: true };
exports.__GT__GT_ = __GT__GT_;
var apply = function (f, aseq) {
	return f.apply(undefined, into_array(aseq));
};
exports.apply = apply;
var when = function (test) {
	var body = Array.prototype.slice.call(arguments, 1);
	return crisp.types.cons(new crisp.types.Symbol('if'), crisp.types.cons(test, crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('do'), crisp.types.splice(body, undefined)), undefined)));
};
when.__metadata__ = { macro: true };
exports.when = when;
var cond = function () {
	var clauses = Array.prototype.slice.call(arguments, 0);
	return seq(clauses) ? function () {
		return crisp.types.list(new crisp.types.Symbol('if'), first(clauses), next(clauses) ? second(clauses) : function () {
			throw new Error('cond requires an even number of forms');
		}(), cons(new crisp.types.Symbol('cond'), next(next(clauses))));
	}() : undefined;
};
cond.__metadata__ = { macro: true };
exports.cond = cond;
var complement = function (f) {
	return function () {
		var args = Array.prototype.slice.call(arguments, 0);
		return !apply(f, args);
	};
};
exports.complement = complement;
var filter = function (pred, coll) {
	return new LazySeq(function () {
		return function (s) {
			return function () {
				return s ? function () {
					return pred(first(s)) ? cons(first(s), filter(pred, rest(s))) : filter(pred, rest(s));
				}() : undefined;
			}();
		}(seq(coll));
	});
};
exports.filter = filter;
var remove = function (pred, coll) {
	return filter(complement(pred), coll);
};
exports.remove = remove;
var take = function (n, coll) {
	return new LazySeq(function () {
		return 0 < n ? function () {
			return function (s) {
				return function () {
					return s ? cons(first(s), take(dec(n), rest(s))) : undefined;
				}();
			}(seq(coll));
		}() : undefined;
	});
};
exports.take = take;
var nth = function (n, coll) {
	return first(drop(n, coll));
};
exports.nth = nth;
var drop = function (n, coll) {
	return function (step) {
		return function () {
			return new LazySeq(function () {
				return step(n, coll);
			});
		}();
	}(function (n, coll) {
		return function (s) {
			return function () {
				return 0 < n && s ? drop(dec(n), rest(s)) : s;
			}();
		}(seq(coll));
	});
};
exports.drop = drop;
var is_contains = function (item, coll) {
	return seq(filter(function (x) {
		return crisp.core.equal(item, x);
	}, coll)) ? true : false;
};
exports.is_contains = is_contains;
var is_nil = function (x) {
	return crisp.core.equal(undefined, x);
};
exports.is_nil = is_nil;
var is_every = function (pred, coll) {
	return is_nil(seq(coll)) ? true : pred(first(coll)) ? is_every(pred, next(coll)) : "else" ? false : undefined;
};
exports.is_every = is_every;
var interleave = function () {
	var colls = Array.prototype.slice.call(arguments, 0);
	return new LazySeq(function () {
		return function (ss) {
			return function () {
				return is_every(identity, ss) ? function () {
					return new Splice(map(first, ss), apply(interleave, map(rest, ss)));
				}() : undefined;
			}();
		}(map(seq, colls));
	});
};
exports.interleave = interleave;
var argcount = function (spec) {
	return is_contains(new crisp.types.Symbol('&'), spec) ? dec(count(spec)) : count(spec);
};
exports.argcount = argcount;
var is_binds = function (spec, args) {
	return is_contains(new crisp.types.Symbol('&'), spec) ? dec(count(spec)) <= count(args) : crisp.core.equal(count(spec), count(args));
};
exports.is_binds = is_binds;
var defn = function (name) {
	var body = Array.prototype.slice.call(arguments, 1);
	return is_array(first(body)) ? crisp.types.cons(new crisp.types.Symbol('def'), crisp.types.cons(name, crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('fn'), crisp.types.splice(body, undefined)), undefined))) : function (args) {
		return function (n) {
			return function () {
				return crisp.types.cons(new crisp.types.Symbol('def'), crisp.types.cons(name, crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('fn'), crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('&'), crisp.types.cons(args, [])), crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('cond'), crisp.types.splice(crisp.core.interleave(map(function (x) {
					return crisp.types.cons(new crisp.types.Symbol('crisp.core.binds?'), crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('quote'), crisp.types.cons(first(x), undefined)), crisp.types.cons(args, undefined)));
				}, body), map(function (x) {
					return crisp.types.cons(new crisp.types.Symbol('crisp.core.apply'), crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('fn'), crisp.types.splice(x, undefined)), crisp.types.cons(args, undefined)));
				}, body)), crisp.types.cons(new crisp.types.Keyword('else'), crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('throw'), crisp.types.cons(crisp.types.cons(new crisp.types.Symbol('Error.'), crisp.types.cons('No matching argspec found.', undefined)), undefined)), undefined)))), undefined))), undefined)));
			}();
		}(new crisp.types.Symbol('n_3'));
	}(new crisp.types.Symbol('args_2'));
};
defn.__metadata__ = { macro: true };
exports.defn = defn;
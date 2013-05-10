/*global exports: true */
"use strict";

var format = require('util').format;
var assert = require('assert');
var CrispString = require('./types').CrispString;
var CrispBoolean = require('./types').CrispBoolean;
var Symbol = require('./types').Symbol;
var Keyword = require('./types').Keyword;
var Vector = require('./types').Vector;
var List = require('./types').List;
var Environment = require('./runtime').Environment;
var Lambda = require('./runtime').Lambda;
var Macro = require('./runtime').Macro;
var equal = require('./runtime').equal;
var read_string = require('./reader').read_string;
var fs = require('fs');
var is_atom = require('./runtime').is_atom;
var is_self_evaluating = require('./runtime').is_self_evaluating;
var is_self_printing = function (form) {
	return typeof form === 'number'
		||
		typeof form === 'boolean'
		||
		typeof form === 'undefined'
		||
		form instanceof CrispString
		||
		form instanceof CrispBoolean
		||
		form instanceof Keyword;
};
var identity = require('./runtime').identity;

// TODO Duplication of interpreter code.
var analyze = function (form, env) {
	// console.log(format("ANALYZING %s", form));
	if (is_atom(form)) {
		if (form instanceof CrispString) {
			return format("%j", form.value);
		}

		if (form instanceof CrispBoolean) {
			return form.value;
		}

		if (form instanceof Keyword) {
			return format("%j", ":" + form.name);
		}

		if (form instanceof Symbol) {
			return form.name;
		}

		if (is_self_printing(form)) {
			return analyze.self_printing(form, env);
		}
	} else {
		if (equal(form.first(), new Symbol("if"))) {
			return analyze.if(form, env);
		}

		if (equal(form.first(), new Symbol("def"))) {
			return analyze.def(form, env);
		}

		if (equal(form.first(), new Symbol("set!"))) {
			return analyze.set(form, env);
		}

		if (equal(form.first(), new Symbol("fn"))) {
			return analyze.lambda(form, env);
		}

		if (equal(form.first(), new Symbol("macro"))) {
			return analyze.macro(form, env);
		}

		if (equal(form.first(), new Symbol("quote"))) {
			return analyze.quote(form, env);
		}

		if (equal(form.first(), new Symbol("syntax-quote"))) {
			return analyze.syntax_quote(form, env);
		}

		return analyze.application(form, env);
	}

	throw new Error("Unhandled form: " + form);
};

analyze.self_printing = function (form, env) {
	return form;
};

analyze.symbol = function (form, env) {
	// TODO Should symbols be self printing, with this code going in the toString method? Might simplify application, as all heads would be resolved first.
	var name = form.name,
		is,
		dash;

	is = name.match(/(.*)\?$/);
	if (is) {
		name = "is_" + is[1];
	}

	name = name.replace(/-/g, "_");

	return name;
};

analyze.string = function (form, env) {
	return format('"%s"', form);
};

analyze.quote = function (form, env) {
	assert.equal(2, form.count(), "Invalid quote form: " + form);
	return form.second();
};

analyze.if = function (form, env) {
	assert.equal(true, 3 <= form.count() <= 4, "Invalid if form: " + form);

	var test_form = analyze(form.second(), env),
		then_form = analyze(form.third(), env),
		else_form = analyze(form.fourth(), env);

	return format("(typeof %s !== 'undefined' && ! equal(%s, new CrispBoolean('false'))) ? %s\n\t: %s", test_form, test_form, then_form, else_form);
};

var compile_lambda = function(lambda, env) {
	var arglist, head, varargs_slice, body, tail;
	arglist = lambda.args.items.map(function (symbol) { return analyze(symbol, env); }).join(", ");
	head = format("function (%s) {\n", arglist);

	if (typeof lambda.rest === 'undefined') {
		varargs_slice = "";
	} else {
		varargs_slice = format(
			"var %s = Array.prototype.slice.call(arguments, %d);\n",
			lambda.rest.name,
			lambda.args.count()
		);
	}

	body = analyze.sequence(
		lambda.body,
		env,
		function (x) { return format("return %s;", x); }
	).join(";\n");

	tail = "\n}";

	return "(" + head + varargs_slice + body + tail + ")";
};

// TODO def can probably be defined in terms of set!
analyze.def = function (form, env) {
	assert.equal(3, form.count(), "Invalid def form: " + form);


	var symbol = analyze(form.second(), env),
		value = analyze(form.third(), env);

	if (value instanceof Macro) {
		env[symbol] = value;
		return format("// Defined macro %s", symbol.name);
	}

	if (value instanceof Lambda) {
		env[symbol] = value;
		return format("var %s = %s", symbol, compile_lambda(value, env));
	}

	return format("var %s = %s", symbol, value);
};

analyze.set = function (form, env) {
	assert.equal(3, form.count(), "Invalid set! form: " + form);

	var symbol = analyze(form.second(), env),
		value = analyze(form.third(), env);

	if (value instanceof Macro) {
		env[symbol] = value;
		return format("// set macro %s", symbol.name);
	}

	if (value instanceof Lambda) {
		env[symbol] = value;
		return format("%s = %s", symbol, compile_lambda(value, env));
	}

	return format("%s = %s", symbol, value);
};

var destructure_args = function (args) {
	var varargs_point, named, rest, i,
		varargs_symbol = new Symbol("&"),
		arg;

	assert.equal(true, args instanceof Vector, "Invalid arguments: " + args);

	varargs_point = -1;
	for (i = 0; i < args.count(); i = i + 1) {
		arg = args.nth(i);
		assert.equal(true, arg instanceof Symbol, format("Invalid argument: %d. Expected symbol, got: %s", i, arg));
		if (varargs_symbol.equal(arg)) {
			varargs_point = i;
		}
	}

	if (varargs_point === -1) {
		named = args;
		rest = undefined;
	} else {
		assert.equal(args.count(), varargs_point + 2, "Exactly one symbol must follow '&' in a varargs declaration.");
		named = args.take(varargs_point);
		rest = args.nth(varargs_point + 1);
	}

	return {named: named, rest: rest};
};
exports.destructure_args = destructure_args;

analyze.lambda = function (form, env) {
	assert.equal(true, 2 <= form.count(), "Invalid fn form: " + form);
	var args = form.second(),
		destructured,
		lambda;

	destructured = destructure_args(args);

	return new Lambda(destructured.named, destructured.rest, form.next().next(), env);
};

analyze.macro = function (form, env) {
	assert.equal(true, 2 <= form.count(), "Invalid macro form: " + form);

	var args = form.second(),
		destructured,
		macro;

	destructured = destructure_args(args);

	return new Macro(destructured.named, destructured.rest, form.next().next(), env);
};

var syntax_expand = function (form, env) {
	var result, i, expanded, analysis, subform;

	if (is_atom(form)) {
		return form;
	}

	if (
		form.count() === 2
		&&
		equal(form.first(), new Symbol("unquote"))
	) {
		return analyze(form.second(), env);
	}

	result = [];
	for (i = 0; i < form.count(); i = i + 1) {
		subform = form.nth(i);

		if (
			!is_atom(subform)
			&&
			subform.count() === 2
			&&
			equal(subform.first(), new Symbol("unquote-splicing"))
		) {
			analysis = analyze(subform.second(), env);
			result = result.concat(analysis);
		} else {
			expanded = syntax_expand(subform, env);
			result.push(expanded);
		}
	}

	return format("new List([%s])", result.join(", "));
};

analyze.syntax_quote = function (form, env) {
	assert.equal(form.count(), 2, "Invalid syntax-quote form: " + form);
	var result = syntax_expand(form.second(), env);
	return result;
};

analyze.sequence = function (forms, env, last_formatter) {
	if (last_formatter === undefined) {
		last_formatter = identity;
	}

	switch(forms.count()) {
		case 0:
			return new List([last_formatter("")]);
		case 1:
			return new List([last_formatter(analyze(forms.first(), env))]);
		default:
			var head = analyze(forms.first(), env),
				body = analyze.sequence(forms.next(), env, last_formatter);

			return body.cons(head);
	}
};

var primitives = {};
primitives.make_infix_function = function (operand_string, arity) {
	return function (fn_args, env) {
		if (typeof(arity) !== "undefined") {
			assert.equal(arity, fn_args.count(), "Invalid number of args.");
		}

		return format("(%s)", analyze.sequence(fn_args, env).join(operand_string));
	};
};

// TODO Right code, wrong place.
primitives[new Symbol("+")]				 = primitives.make_infix_function(" + ");
primitives[new Symbol("-")]				 = primitives.make_infix_function(" - ");
primitives[new Symbol("*")]				 = primitives.make_infix_function(" * ");
primitives[new Symbol("/")]				 = primitives.make_infix_function(" / ");
primitives[new Symbol("and")]			 = primitives.make_infix_function(" && ");
primitives[new Symbol("or")]			 = primitives.make_infix_function(" || ");
primitives[new Symbol("instanceof?")]	 = primitives.make_infix_function(" instanceof ", 2);
primitives[new Symbol("identical?")]	 = primitives.make_infix_function(" === "); // TODO is this right?

primitives[new Symbol("=")] = function (fn_args, env) {
	assert.equal(2, fn_args.count(), "Invalid arguments to =: " + fn_args);
	return format(
		"(equal(%s,%s) ? new CrispBoolean('true') : new CrispBoolean('false'))",
		fn_args.first(),
		fn_args.second()
	);
};
primitives[new Symbol("not")] = function (fn_args, env) {
	assert.equal(1, fn_args.count(), "Invalid arguments to not: " + fn_args);
	return format("!%s", analyze(fn_args.first(), env));
};
primitives[new Symbol("export")] = function (fn_args, env) {
	assert.equal(1, fn_args.count(), "Invalid arguments to export: " + fn_args);
	var name = analyze(fn_args.first(), env);
	return format("exports.%s = %s", name, name);
};
primitives[new Symbol("typeof")] = function (fn_args, env) {
	assert.equal(1, fn_args.count(), "Invalid arguments to typeof: " + fn_args);
	var name = analyze(fn_args.first(), env);
	return format("typeof %s", analyze(fn_args.first(), env));
};
primitives[new Symbol("throw")] = function (fn_args, env) {
	return format("(function () { throw %s; }())", analyze.sequence(fn_args, env).join(" + "));
};

analyze.application = function (form, env) {
	var fn_name,
		fn_args,
		env_lookup,
		macro, sub_env,
		primitive,
		constructor = /(.*)\.$/,
		property_access = /^\.-(.*)/,
		method_access = /^\.(.*)/,
		match,
		lambda, head, arglist, varargs_slice, body, tail,
		expanded, result;


	fn_name = analyze(form.first(), env);
	fn_args = form.next();

	if (fn_name instanceof Lambda) {
		return format("(%s(%s))", compile_lambda(fn_name, env), fn_args.join(","));
	}

	if (is_atom(fn_name)) {
		env_lookup = env[fn_name];
		if (env_lookup instanceof Macro) {
			console.log(format("MACRO NAME: %s", fn_name));
			console.log(format("MACRO ARGS: %s", fn_args));
			macro = env_lookup;

			sub_env = macro.env.extend_by(fn_name, macro.args, macro.rest, analyze.sequence(fn_args, env));
			var new_lambda = new Lambda(macro.args, macro.rest, macro.body, sub_env);
			var new_form = fn_args.cons(new_lambda);
			console.log(format("New form: %s", new_form.next()));
			var code_to_run = analyze.application(new_form, env);
			console.log(format("Code to run: %s", code_to_run));
			var run_code = eval(code_to_run);
			console.log(format("Run code: %s", run_code));
			console.log(format("Output of that: %s", analyze(run_code, env)));
			return analyze(run_code, env);


			// var code_to_run =

			// console.log(format("New form: %s", new_form));
			// console.log(format("BODY: %s", macro.body));
			// console.log(format("EXPANDED: %s", expanded));
			// console.log(format("AN: %s", analyze.application(new_lambda, env)));
			// result = analyze(expanded, env);
			return "// KAJ macro invoked";
		}

		// Interop.
		match = constructor.exec(fn_name.name);
		if (match) { // TODO might move this to the symbol code...
			return format("new %s(%s)", match[1], analyze.sequence(fn_args, env).join());
		}

		match = property_access.exec(fn_name.name);
		if (match) { // TODO might move this to the symbol code...
			assert.equal(1, fn_args.count(), "Invalid arguments to property access: " + fn_args);
			return format("%s.%s", analyze(fn_args.first(), env), match[1]);
		}

		match = method_access.exec(fn_name.name);
		if (match) { // TODO might move this to the symbol code...
			assert.equal(true, fn_args.count() >= 1, "Invalid arguments to method access: " + fn_args);
			return format("%s.%s(%s)", analyze(fn_args.first(), env), match[1], analyze.sequence(fn_args.next(), env).join());
		}

		// Primitive.
		primitive = primitives[fn_name];
		if (typeof primitive !== "undefined") {
			return primitive(fn_args, env);
		}

		// We should be doing some compile-time checking here.
		assert.equal(true, fn_name instanceof Symbol, format("Trying to invoke a non-symbol argument name: %j", fn_name));
		return format("%s(%s)", fn_name.name, analyze.sequence(fn_args, env).join());
	}

	return format("((%s)(%s))", analyze(fn_name, env), analyze.sequence(fn_args, env).join());
};

var preamble = function () {
	return [
		"// START",
		'"use strict";\n',
		"var Keyword = require('../lib/types').Keyword;",
		"var List = require('../lib/types').List;",
		"var Symbol = require('../lib/types').Symbol;",
		"var Vector = require('../lib/types').Vector;",
		"var CrispString = require('../lib/types').CrispString;",
		"var CrispBoolean = require('../lib/types').CrispBoolean;",
		"var equal = require('deep-equal');",
	];
};

var postamble = function () {
	return ["// END"];
};

var compile = function (string, env) {
	var remaining_string = string,
		result = [],
		form, read, analyzed, compiled;

	result = result.concat(preamble());
	while (remaining_string.length > 0) {

		read = read_string(remaining_string);
		form = read.result;
		remaining_string = read.remainder;

		if (read.type !== 'WHITESPACE') {
			analyzed = analyze(form, env);
			if (analyzed instanceof Lambda) {
				analyzed = compile_lambda(analyzed, env);
			}
			result.push(analyzed + ";\n");
		}
	}
	result = result.concat(postamble());

	return result;
};
exports.compile = compile;

String.prototype.repeat = function (n) {
	var result = "", i;
	for (i = 0; i < n; i = i + 1) {
		result = result.concat(this);
	}
	return result;
};

var compile_string = function (input, env) {
	var compiled, output;

	compiled = compile(input, env);
	output = compiled.join("\n");

	return output;
};
exports.compile_string = compile_string;

// TODO Make this asynchronous. (Easy, but making Grunt respect that is harder.)
var compile_io = function (input, output, env, callback) {
	var data = fs.readFileSync(input, {encoding: "utf-8"}),
		compiled = compile_string(data, env);

	fs.writeFileSync(output, compiled);
};
exports.compile_io = compile_io;

var base_environment = new Environment();
base_environment.require = require;
// TODO I think these are only required by the interpreter, not the compiler.
base_environment[new Symbol("nil")] = undefined;
base_environment[new Symbol("true")] = new Symbol("false");
base_environment[new Symbol("false")] = new Symbol("false");
base_environment[new Symbol("=")] = equal;
base_environment[new Symbol("typeof")] = function typeof_internal(arg) {
	return typeof arg;
};
base_environment[new Symbol("nil?")] = function is_nil(arg) {
	var result = typeof arg === "undefined" || (arg === false);
	return result;
};
base_environment[new Symbol("length")] = function length(arg) {
	return arg.length;
};
base_environment[new Symbol("not")] = function not_internal(arg) {
	return !arg;
};
base_environment[new Symbol("+")] = function plus() {
	var result = 0, i;
	for (i = 0; i < arguments.length; i = i + 1) {
		result += arguments[i];
	}
	return result;
};
base_environment[new Symbol("-")] = function minus(head) {
	if (typeof head === 'undefined') {
		return 0;
	}

	var result = head, i;

	for (i = 1; i < arguments.length; i = i + 1) {
		result -= arguments[i];
	}
	return result;
};
base_environment[new Symbol("*")] = function multiply(head) {
	if (typeof head === 'undefined') {
		return 0;
	}

	var result = head, i;

	for (i = 1; i < arguments.length; i = i + 1) {
		result *= arguments[i];
	}
	return result;
};
base_environment[new Symbol("/")] = function divide(head) {
	if (typeof head === 'undefined') {
		return 0;
	}

	var result = head, i;

	for (i = 1; i < arguments.length; i = i + 1) {
		result /= arguments[i];
	}
	return result;
};
base_environment[new Symbol("vec")] = function vec() {
	return new Vector(Array.prototype.slice.call(arguments, 0));
};
base_environment[new Symbol("first")] = function first(coll) {
	assert.equal(true, arguments.length <= 1, "first called with incorrect number of arguments." + arguments.length);
	if (typeof coll === 'undefined') {
		return undefined;
	}

	assert.equal(true, coll instanceof Array, "first called with an argument that is not a collection" );
	if (coll.length > 0) {
		return coll[0];
	}
};
base_environment[new Symbol("second")] = function second(coll) {
	assert.equal(true, arguments.length <= 1, "second called with incorrect number of arguments." + arguments.length);
	if (typeof coll === 'undefined') {
		return undefined;
	}

	assert.equal(true, coll instanceof Array, "second called with an argument that is not a collection" );
	if (coll.length > 1) {
		return coll[1];
	}
};
base_environment[new Symbol("rest")] = function rest(coll) {
	assert.equal(true, arguments.length <= 1, "rest called with incorrect number of arguments." + arguments.length);
	if (typeof coll === 'undefined') {
		return undefined;
	}

	assert.equal(true, coll instanceof Array, "rest called with an argument that is not a collection" );
	if (coll.length > 1) {
		return coll.slice(1);
	}
};
/* TODO Core libs.
(function () {
	var data = fs.readFileSync("src/macros.crisp", {encoding: "utf-8"}),
		compiled = compile_string(data, base_environment);
}());
*/
exports.base_environment = base_environment;

var usage = "USAGE TODO";

var main = function () {
	assert.equal(process.argv.length, 4, usage);
	var input	 = process.argv[2],
		output	 = process.argv[3],
		env		 = base_environment.extend();

	compile_io(input, output, env, function () { console.log("Done"); });
};

if (require.main === module) {
    main();
}

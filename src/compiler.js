"use strict";

var assert = require('assert');
var Symbol = require('./types').Symbol;
var Keyword = require('./types').Keyword;
var Environment = require('./runtime').Environment;
var Lambda = require('./runtime').Lambda;
var Macro = require('./runtime').Macro;
var equal = require('./runtime').equal;
var read_string = require('./reader').read_string;
var fs = require('fs');
var base_environment = require('./baseenv').base_environment;
var is_atom = require('./runtime').is_atom;
var is_self_evaluating = require('./runtime').is_self_evaluating;
var is_self_printing = function (form) {
	return (typeof(form) === 'number');
};

// TODO Duplication of interpreter code.
var analyze = function (form, env) {
	// console.log("ANALYZING", form);
	if (is_atom(form)) {
		if (is_self_printing(form)) {
			return analyze.self_printing(form, env);
		}

		if (form instanceof Symbol) {
			return analyze.symbol(form, env);
		}

		if (form instanceof Keyword) {
			return analyze.keyword(form, env);
		}

		if (typeof(form) === "string") {
			return analyze.string(form, env);
		}
	} else {
		if (equal(form[0], new Symbol("quote"))) {
			return analyze.quote(form, env);
		}

		if (equal(form[0], new Symbol("if"))) {
			return analyze.if(form, env);
		}

		if (equal(form[0], new Symbol("do"))) {
			return analyze.do(form, env);
		}

		if (equal(form[0], new Symbol("def"))) {
			return analyze.def(form, env);
		}

		if (equal(form[0], new Symbol("set!"))) {
			return analyze.set(form, env);
		}

		if (equal(form[0], new Symbol("fn"))) {
			return analyze.lambda(form, env);
		}

		return analyze.application(form, env);
	}

	throw "Unhandled form: " + form;
};

analyze.self_printing = function (form, env) {
	return form;
};

analyze.symbol = function (form, env) {
	// TODO Should symbols be self printing, with this code going in the toString method? Might simplify application, as all heads would be resolved first.
	var name = form.name,
		is, dash;

	is = name.match(/(.*)\?$/);
	if (is) {
		name = "is_" + is[1];
	}

	name = name.replace(/-/g, "_");

	return name;
};

analyze.quote = function (form, env) {
	assert.equal(2, form.length, "Invalid quote form: " + form);
	return form[1];
};

analyze.keyword = function (form, env) {
	return '"' + form.name + '"';
};

analyze.string = function (form, env) {
	return '"' + form + '"';
};

analyze.if = function (form, env) {
	assert.equal(true, 3 <= form.length <= 4, "Invalid if form: " + form);
	var result = [],
		test_form, then_form, else_form;

	test_form = analyze(form[1], env);
	then_form = analyze(form[2], env);

	if (form.length === 4) {
		else_form = analyze(form[3], env);
	} else {
		else_form = "undefined";
	}

	result.push(test_form + " ? ");
	result.push(then_form);
	result.push(" : ");
	result.push(else_form);

	return result.join("\n");
};

analyze.def = function (form, env) {
	assert.equal(3, form.length, "Invalid def form: " + form);

	var name = analyze(form[1], env),
		value = analyze(form[2], env);

	return "var " + name + " = " + value;
};

analyze.set = function (form, env) {
	assert.equal(3, form.length, "Invalid set! form: " + form);

	var name = analyze(form[1], env),
		value = analyze(form[2], env);

	return name + " = " + value;
};

// TODO Copied from interpreter.
var destructure_args = function (args) {
	var varargs_point, named, rest, i,
		varargs_symbol = new Symbol("&");

	// TODO We're slicing off the leading '#vec' here. Seems odd. Fix when we destructure binds.
	assert.equal(true, equal(new Symbol("vec"), args[0]), "Invalid first arg: " + args[0]);

	varargs_point = -1;
	for (i = 0; i < args.length; i = i + 1) {
		if (varargs_symbol.equal(args[i])) {
			varargs_point = i;
		}
	}

	if (varargs_point === -1) {
		named = args.slice(1);
		rest = undefined;
	} else {
		assert.equal(args.length, varargs_point + 2, "Exactly one symbol may follow '&' in a varargs declaration.");
		named = args.slice(1, varargs_point);
		rest = args.slice(varargs_point + 1);
	}

	return {named: named, rest: rest};
};

analyze.lambda = function (form, env) {
	assert.equal(true, 2 <= form.length, "Invalid fn form: " + form);
	var args = form[1],
		body = form.slice(2),
		destructured = destructure_args(args),
		lambda,
		head, varargs_slice, body_str, tail;

	lambda = new Lambda(destructured.named, destructured.rest, form.slice(2), env);

	return analyze.application(lambda, env);
};

analyze.sequence = function (forms, env, separator) {
	switch(forms.length) {
		case 0:
			return "";
		case 1:
			return analyze(forms[0], env);
		default:
			return forms.map(function (form) {
				return analyze(form, env);
			}).join(separator);
	}
};

analyze.do_inner = function (form, env, last_formatter) {
	switch(form.length) {
		case 0:
			return [last_formatter("")];
		case 1:
			return [last_formatter(analyze(form[0], env))];
		default:
			var result = analyze.do_inner(form.slice(1), env, last_formatter);
			result.unshift(analyze(form[0], env));
			return result;
	}
};

analyze.do = function (form, env) {
	return analyze.do_inner(form.slice(1), env, function (x) { return x; }).join("");
};

var primitives = {};
primitives.make_infix_function = function (operand_string, arity) {
	return function (fn_args, env) {
		if (typeof(arity) !== "undefined") {
			assert.equal(arity, fn_args.length, "Invalid number of args.");
		}
		return "(" + analyze.sequence(fn_args, env, operand_string) + ")";
	};
};

// TODO Right code, wrong place.
primitives[new Symbol("+")]				 = primitives.make_infix_function(" + ");
primitives[new Symbol("-")]				 = primitives.make_infix_function(" - ");
primitives[new Symbol("*")]				 = primitives.make_infix_function(" * ");
primitives[new Symbol("/")]				 = primitives.make_infix_function(" / ");
primitives[new Symbol("=")]				 = primitives.make_infix_function(" === ");
primitives[new Symbol("and")]			 = primitives.make_infix_function(" && ");
primitives[new Symbol("or")]			 = primitives.make_infix_function(" || ");
primitives[new Symbol("instanceof?")]	 = primitives.make_infix_function(" instanceof ", 2);
primitives[new Symbol("identical?")]	 = primitives.make_infix_function(" === "); // TODO is this right?

primitives[new Symbol("not")] = function (fn_args, env) {
	assert.equal(1, fn_args.length, "Invalid arguments to not: " + fn_args);
	return "!" + analyze(fn_args[0], env);
};
primitives[new Symbol("export")] = function (fn_args, env) {
	assert.equal(1, fn_args.length, "Invalid arguments to export: " + fn_args);
	var name = analyze(fn_args[0], env);
	return "exports." + name + " = " + name;
};
primitives[new Symbol("typeof")] = function (fn_args, env) {
	assert.equal(1, fn_args.length, "Invalid arguments to typeof: " + fn_args);
	var name = analyze(fn_args[0], env);
	return "typeof " + analyze(fn_args[0], env);
};
primitives[new Symbol("throw")] = function (fn_args, env) {
	return "(function () { throw " + analyze.sequence(fn_args, env, " + ") + "; }())";
};

analyze.application = function (form, env) {
	var fn_name,
		fn_args,
		primitive,
		constructor = /(.*)\.$/,
		property_access = /^\.-(.*)/,
		method_access = /^\.(.*)/,
		match,
		lambda, head, varargs_slice, body, tail;

	if (form instanceof Lambda) {
		lambda = form;
		head = "function (" + lambda.args.join(", ") + ") {\n";

		if (typeof lambda.rest === 'undefined') {
			varargs_slice = "";
		} else {
			varargs_slice = "var " + lambda.rest + " = Array.prototype.slice.call(arguments, " + lambda.args.length +");\n";
		}

		body = analyze.do_inner(
			lambda.body,
			env,
			function (x) { return "return " + x + ";"; }
		).join(";\n");

		tail = "\n}";

		return head + varargs_slice + body + tail;
	}

	fn_name = form[0];
	fn_args = form.slice(1);
	if (is_atom(fn_name)) {
		// Interop.
		match = constructor.exec(fn_name.name);
		if (match) { // TODO might move this to the symbol code...
			return "new " + match[1] + "(" + analyze.sequence(fn_args, env, ", ") + ")";
		}

		match = property_access.exec(fn_name.name);
		if (match) { // TODO might move this to the symbol code...
			assert.equal(1, fn_args.length, "Invalid arguments to property access: " + fn_args);
			return analyze(fn_args[0], env) + "." + match[1];
		}

		match = method_access.exec(fn_name.name);
		if (match) { // TODO might move this to the symbol code...
			assert.equal(true, fn_args.length >= 1, "Invalid arguments to method access: " + fn_args);
			return analyze(fn_args[0], env) + "." + match[1] + "(" + analyze.sequence(fn_args.slice(1), env, ", ") + ")";
		}

		// Primitive.
		primitive = primitives[fn_name];
		if (typeof primitive !== "undefined") {
			return primitive(fn_args, env);
		}

		// Fn. TODO Does this go away with real interop?
		return fn_name + "(" + analyze.sequence(fn_args, env, ", ") + ")";
	}

	return "((" + analyze(fn_name, env) + ")(" + analyze.sequence(fn_args, env, ", ") + "))";
};

var preamble = function () {
	return ["/* jslint indent: 0 */", "// START", '"use strict";\n'];
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
			// console.log("FORM", form);

			analyzed = analyze(form, env);
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

var usage = "USAGE TODO";
var compile_string = function (input) {
	var env, compiled, output;

	env = base_environment.extend();
	compiled = compile(input, env);
	output = compiled.join("\n");

	return output;
};
exports.compile_string = compile_string;

// TODO Make this asynchronous. (Easy, but making Grunt respect that is harder.)
var compile_io = function (input, output, callback) {
	var data = fs.readFileSync(input, {encoding: "utf-8"}),
		compiled = compile_string(data);

	fs.writeFileSync(output, compiled);
};
exports.compile_io = compile_io;

var main = function () {
	assert.equal(process.argv.length, 4, usage);
	var input = process.argv[2],
		output = process.argv[3];

	compile_io(input, output, function () { console.log("Done"); });
};

if (require.main === module) {
    main();
}

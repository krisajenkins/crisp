"use strict";

var util = require('util');
var format = require('util').format;
var inspect = require('util').inspect;
var assert = require('assert');
var Symbol = require('./types').Symbol;
var interpreter = require('./interpreter');
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
var identity = require('./runtime').identity;

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

		if (equal(form[0], new Symbol("syntax-quote"))) {
			return analyze.syntax_quote(form, env);
		}

		if (equal(form[0], new Symbol("if"))) {
			return analyze.if(form, env);
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

		if (equal(form[0], new Symbol("macro"))) {
			return analyze.macro(form, env);
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

var syntax_expand = function (form, env) {
	var result, i, expanded, analysis, subform;

	if (is_atom(form)) {
		return form;
	}

	if (
		form.length === 2
		&&
		equal(form[0], new Symbol("unquote"))
	) {
		return analyze(form[1], env);
	}

	result = [];
	for (i = 0; i < form.length; i = i + 1) {
		subform = form[i];

		if (
			!is_atom(subform)
			&&
			subform.length === 2
			&&
			equal(subform[0], new Symbol("unquote-splicing"))
		) {
			analysis = analyze(subform[1], env);
			result = result.concat(analysis);
		} else {
			expanded = syntax_expand(subform, env);
			result.push(expanded);
		}
	}

	return result;
};

analyze.syntax_quote = function (form, env) {
	assert.equal(form.length, 2, "Invalid syntax-quote form: " + form);
	var result = syntax_expand(form[1], env);
	return result;
};

analyze.keyword = function (form, env) {
	return format('"%s"', form);
};

analyze.string = function (form, env) {
	return format('"%s"', form);
};

analyze.if = function (form, env) {
	assert.equal(true, 3 <= form.length <= 4, "Invalid if form: " + form);
	var test_form, then_form, else_form;

	test_form = analyze(form[1], env);
	then_form = analyze(form[2], env);

	if (form.length === 4) {
		else_form = analyze(form[3], env);
	} else {
		else_form = "undefined";
	}

	return format("%s ? %s : %s", test_form, then_form, else_form);
};

analyze.def = function (form, env) {
	assert.equal(3, form.length, "Invalid def form: " + form);

	var name = analyze(form[1], env),
		value = analyze(form[2], env);

	if (value instanceof Macro) {
		env[name] = value;
		return format("// Defined macro %s", name);
	}

	return format("var %s = %s", name, value);
};

analyze.set = function (form, env) {
	assert.equal(3, form.length, "Invalid set! form: " + form);

	var name = analyze(form[1], env),
		value = analyze(form[2], env);

	return format("%s = %s", name, value);
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
		destructured = destructure_args(args),
		lambda,
		head, varargs_slice, body_str, tail;

	lambda = new Lambda(destructured.named, destructured.rest, form.slice(2), env);

	return analyze.application(lambda, env);
};

analyze.macro = function (form, env) {
	assert.equal(true, 3 <= form.length, "Invalid macro form: " + form);
	var macro = interpreter.analyze(form)(env);

	return macro;
};

analyze.sequence = function (forms, env, last_formatter) {
	if (last_formatter === undefined) {
		last_formatter = identity;
	}

	switch(forms.length) {
		case 0:
			return [last_formatter("")];
		case 1:
			return [last_formatter(analyze(forms[0], env))];
		default:
			var result = analyze.sequence(forms.slice(1), env, last_formatter);
			result.unshift(analyze(forms[0], env));
			return result;
	}
};

var primitives = {};
primitives.make_infix_function = function (operand_string, arity) {
	return function (fn_args, env) {
		if (typeof(arity) !== "undefined") {
			assert.equal(arity, fn_args.length, "Invalid number of args.");
		}

		return format("(%s)", analyze.sequence(fn_args, env).join(operand_string));
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
	return format("!%s", analyze(fn_args[0], env));
};
primitives[new Symbol("export")] = function (fn_args, env) {
	assert.equal(1, fn_args.length, "Invalid arguments to export: " + fn_args);
	var name = analyze(fn_args[0], env);
	return format("exports.%s = %s", name, name);
};
primitives[new Symbol("typeof")] = function (fn_args, env) {
	assert.equal(1, fn_args.length, "Invalid arguments to typeof: " + fn_args);
	var name = analyze(fn_args[0], env);
	return format("typeof %s", analyze(fn_args[0], env));
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
		lambda, head, varargs_slice, body, tail,
		expanded, result;

	if (form instanceof Lambda) {
		lambda = form;
		head = format("function (%s) {\n", lambda.args.join(", "));

		if (typeof lambda.rest === 'undefined') {
			varargs_slice = "";
		} else {
			varargs_slice = format(
				"var %s = Array.prototype.slice.call(arguments, %d);\n",
				lambda.rest,
				lambda.args.length
			);
		}

		body = analyze.sequence(
			lambda.body,
			env,
			function (x) { return format("return %s;", x); }
		).join(";\n");

		tail = "\n}";

		return head + varargs_slice + body + tail;
	}

	fn_name = form[0];
	fn_args = form.slice(1);

	if (is_atom(fn_name)) {
		env_lookup = env[fn_name];
		if (env_lookup instanceof Macro) {
			macro = env_lookup;
			sub_env = macro.env.extend_by(fn_name, macro.args, macro.rest, fn_args);
			expanded = macro.body(sub_env);
			result = analyze(expanded, env);
			return result;
		}
	}

	if (is_atom(fn_name)) {
		// Interop.
		match = constructor.exec(fn_name.name);
		if (match) { // TODO might move this to the symbol code...
			return format("new %s(%s)", match[1], analyze.sequence(fn_args, env).join());
		}

		match = property_access.exec(fn_name.name);
		if (match) { // TODO might move this to the symbol code...
			assert.equal(1, fn_args.length, "Invalid arguments to property access: " + fn_args);
			return format("%s.%s", analyze(fn_args[0], env), match[1]);
		}

		match = method_access.exec(fn_name.name);
		if (match) { // TODO might move this to the symbol code...
			assert.equal(true, fn_args.length >= 1, "Invalid arguments to method access: " + fn_args);
			return format("%s.%s(%s)", analyze(fn_args[0], env), match[1], analyze.sequence(fn_args.slice(1), env).join());
		}

		// Primitive.
		primitive = primitives[fn_name];
		if (typeof primitive !== "undefined") {
			return primitive(fn_args, env);
		}

		// Fn. TODO Does this go away with real interop?
		// console.log("WARNING", form);
		return format("%s(%s)", fn_name, analyze.sequence(fn_args, env).join());
	}

	return format("((%s)(%s))", analyze(fn_name, env), analyze.sequence(fn_args, env).join());
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

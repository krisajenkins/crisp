"use strict";

var assert = require('assert');
var Symbol = require('./runtime').Symbol;
var Keyword = require('./runtime').Keyword;
var Environment = require('./runtime').Environment;
var equal = require('./runtime').equal;
var read_string = require('./reader').read_string;
var fs = require('fs');
var base_environment = require('./runtime').base_environment;
var is_atom = require('./runtime').is_atom;
var is_self_evaluating = require('./runtime').is_self_evaluating;
var is_self_printing = function (form) {
	return (typeof(form) === 'number');
};

// TODO redefs!
Symbol.prototype.toString = function () {
	return this.name;
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
		// TODO
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

		return analyze.primitive(form, env);
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

	return "var " + name + " = " + value + ";\nexports." + name + " = " + name;
};

analyze.set = function (form, env) {
	assert.equal(3, form.length, "Invalid set! form: " + form);

	var name = analyze(form[1], env),
		value = analyze(form[2], env);

	return name + " = " + value;
};

analyze.lambda = function (form, env) {
	assert.equal(true, 2 <= form.length, "Invalid fn form: " + form);
	var arglist, statement;

	arglist = form[1].slice(1).join(", ");

	if (form.length === 2) {
		return "function (" + arglist + ") {}";
	}

	statement = analyze.do_inner(
		form.slice(2),
		env,
		function (x) { return "return " + x + ";"; }
	).join(";\n");

	return "function (" + arglist + ") {\n" + statement + "\n}";
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

analyze.primitive = function (form, env) {
	var fn_name = form[0],
		fn_args = form.slice(1),
		bracket_statement,
		infix_function,
		make_infix_function,
		lookup,
		primitive,
		newcont;

	if (is_atom(fn_name)) {
		bracket_statement = function (statement) {
			return "(" + statement + ")";
		};

		make_infix_function = function (operand_string, arity) {
			return function (fn_args, env) {
				if (typeof(arity) !== "undefined") {
					assert.equal(arity, fn_args.length, "Invalid number of args.");
				}
				return "(" + analyze.sequence(fn_args, env, operand_string) + ")";
			};
		};

		infix_function = function (fn_args, env, operand_string) {
			return "(" + analyze.sequence(fn_args, env, operand_string) + ")";
		};

		// TODO Right code, wrong place.
		lookup = {};
		lookup[new Symbol("+")]				 = make_infix_function(" + ");
		lookup[new Symbol("*")]				 = make_infix_function(" * ");
		lookup[new Symbol("=")]				 = make_infix_function(" === ");
		lookup[new Symbol("and")]			 = make_infix_function(" && ");
		lookup[new Symbol("or")]			 = make_infix_function(" || ");
		lookup[new Symbol("instanceof?")]	 = make_infix_function(" instanceof ", 2);
		lookup[new Symbol("identical?")]	 = make_infix_function(" === "); // TODO is this right?

		lookup[new Symbol("not")] = function (fn_name, args) {
			assert.equal(1, fn_args.length, "Invalid not form: " + form);
			return "!" + analyze(fn_args[0], env);
		};
		lookup[new Symbol("throw")] = function (fn_name, args) {
			return "(function () { throw " + analyze.sequence(fn_args, env, " + ") + "; }())";
		};

		primitive = lookup[fn_name];
		if (typeof primitive !== "undefined") {
			return primitive(fn_args, env);
		}

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
	for (i = 0; i < n; i++) {
		result = result.concat(this);
	}
	return result;
};

var usage = "USAGE TODO";

// TODO Make this asynchronous. (Easy, but making Grunt respect that is harder.)
var compile_io = function (input, output, callback) {
	var env = base_environment.extend(),
		data = fs.readFileSync(input, {encoding: "utf-8"}),
		compiled = compile(data, env),
		string = compiled.join("\n");

	fs.writeFileSync(output, string);
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
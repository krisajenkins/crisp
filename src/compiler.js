"use strict";

var assert = require('assert');
var Symbol = require('./runtime').Symbol;
var Keyword = require('./runtime').Keyword;
var Lambda = require('./runtime').Lambda; // TODO Delete?
var Environment = require('./runtime').Environment;
var equal = require('./runtime').equal;
var read_string = require('./reader').read_string;
var fs = require('fs');
var base_environment = require('../src/runtime').base_environment;
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
var analyze = function (form, env, cont) {
	// console.log("ANALYZING", form);
	if (is_atom(form)) {
		if (is_self_printing(form)) {
			return analyze.self_printing(form, env, cont);
		}

		if (form instanceof Symbol) {
			return analyze.symbol(form, env, cont);
		}

		if (form instanceof Keyword) {
			return analyze.keyword(form, env, cont);
		}

		if (typeof(form) === "string") {
			return analyze.string(form, env, cont);
		}
	} else {
		if (equal(form[0], new Symbol("quote"))) {
			return analyze.quote(form);
		}

		if (equal(form[0], new Symbol("if"))) {
			return analyze.if(form, env, cont);
		}

		if (equal(form[0], new Symbol("def"))) {
			return analyze.def(form, env, cont);
		}

		if (equal(form[0], new Symbol("fn"))) {
			return analyze.lambda(form, env, cont);
		}

		return analyze.primitive(form, env, cont);
	}

	throw "Unhandled form: " + form;
};

analyze.self_printing = function (form, env, cont) {
	cont(form);
};

analyze.symbol = function (form, env, cont) {
	cont(form);
};

analyze.keyword = function (form, env, cont) {
	cont('"' + form.name + '"');
};

analyze.string = function (form, env, cont) {
	cont('"' + form + '"');
};

analyze.if = function (form, env, cont) {
	assert.equal(true, 3 <= form.length <= 4, "Invalid if form: " + form);
	var result = [],
		test_form, then_form, else_form;

	analyze(form[1], env, function (statement) {
		test_form = statement;
	});

	analyze(form[2], env, function (statement) {
		then_form = statement;
	});
	if (form.length === 4) {
		analyze(form[3], env, function (statement) {
			else_form = statement;
		});
	} else {
		else_form = "undefined";
	}

	result.push(test_form + " ? " );
	result.push(then_form);
	result.push(" : ");
	result.push(else_form);

	cont(result.join("\n"));
};

analyze.def = function (form, env, cont) {
	assert.equal(3, form.length, "Invalid def form: " + form);
	var symbol = form[1],
		newcont = function (statement) {
			cont("var " + symbol.name + " = " + statement + ";\nexports." + symbol.name + " = " + symbol.name);
		};
	analyze(form[2], env, newcont);
};

analyze.lambda = function (form, env, cont) {
	var newcont = function (statement) {
		cont("function (" + form[1].slice(1).join(", ") + ") {\nreturn " + statement + ";\n}");
	};
	analyze(form[2], env, newcont);
};

analyze.sequence = function (forms, env, cont) {
	switch(forms.length) {
		case 0:
			cont("");
			break;
		case 1:
			analyze(forms[0], env, function (statement) {
				cont(statement);
			});
			break;
		default:
			analyze(forms[0], env, function (statement1) {
				analyze.sequence(forms.slice(1), env, function (statement2) {
					cont(statement1 + ", " + statement2);
				});
			});
	}
};

analyze.join_sequence = function (forms, separator, env, cont) {
	switch(forms.length) {
		case 0:
			cont("");
			break;
		case 1:
			analyze(forms[0], env, function (statement) {
				cont(statement);
			});
			break;
		default:
			analyze(forms[0], env, function (statement1) {
				analyze.join_sequence(forms.slice(1), separator, env, function (statement2) {
					cont(statement1 + separator + statement2);
				});
			});
	}
};

analyze.primitive = function (form, env, cont) {
	var fn_name = form[0],
		fn_args = form.slice(1),
		inline_cont,
		prefix_cont,
		newcont;

	if (is_atom(fn_name)) {
		inline_cont = function (statement) {
			cont("(" + statement + ")");
		};

		prefix_cont = function (statement) {
			cont(fn_name + "(" + statement + ")");
		};

		if (equal(fn_name, new Symbol("+"))) {
			analyze.join_sequence(fn_args, " + ", env, inline_cont);
		} else if (equal(fn_name, new Symbol("*"))) {
			analyze.join_sequence(fn_args, " * ", env, inline_cont);
		} else {
			analyze.sequence(fn_args, env, prefix_cont);
		}
	} else {
		analyze(fn_name, env, function (fn_statement) {
			analyze.sequence(fn_args, env, function (args_statement) {
				cont("((" + fn_statement + ")(" + args_statement + "))");
			});
		});
	}
};

var preamble = function () {
	return ["// START", '"use strict";\n'];
};

var postamble = function () {
	return ["// END"];
};

var compile = function (string, env) {
	var remaining_string = string,
		result = [],
		form, read, analyzed, compiled;
	
	// TODO CPS-Cheat!
	function save_result(statement) {
		result.push(statement + ";\n");
	}

	result = result.concat(preamble());
	while (remaining_string.length > 0) {

		read = read_string(remaining_string);
		form = read.result;
		remaining_string = read.remainder;

		if (read.type !== 'WHITESPACE') {
			console.log("FORM", form);

			analyze(form, env, save_result);
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

var main = function () {
	assert.equal(process.argv.length, 4, usage);
	var input = process.argv[2],
		output = process.argv[3],
		env = base_environment.extend();

	console.log("Compiling:", input, "to:", output);

	fs.readFile(input, {encoding: "utf-8"}, function (error, data) {
		if (error) { throw error; }
		var compiled = compile(data, env),
			string = compiled.join("\n");

		fs.writeFile(output, string, function (error, data) {
			if (error) { throw error; }
			console.log("Done.");
		});
	});
};

if (require.main === module) {
    main();
}

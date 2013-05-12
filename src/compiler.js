/*global exports: true */
"use strict";

var format = require('util').format;
var assert = require('assert');
var CrispString = require('./types').CrispString;
var CrispNumber = require('./types').CrispNumber;
var CrispBoolean = require('./types').CrispBoolean;
var Symbol = require('./types').Symbol;
var Keyword = require('./types').Keyword;
var Vector = require('./types').Vector;
var List = require('./types').List;
var Environment = require('./runtime').Environment;
var Quote = require('./runtime').Quote;
var SyntaxQuote = require('./runtime').SyntaxQuote;
var Unquote = require('./runtime').Unquote;
var UnquoteSplicing = require('./runtime').UnquoteSplicing;
var CrispIf = require('./runtime').CrispIf;
var CrispDef = require('./runtime').CrispDef;
var Lambda = require('./runtime').Lambda;
var Procedure = require('./runtime').Procedure;
var Macro = require('./runtime').Macro;
var equal = require('./runtime').equal;
var read_string = require('./reader').read_string;
var fs = require('fs');

// Analyze functions take a form and turn it into a (more easily)
// compilable object. In general it does this by analysing all the
// components of a list. However, it allows for some specal forms.
var analyse = function analyse(form, env) {
	if (form instanceof List) {
		if (equal(form.first(), new Symbol("quote"))) {
			return analyse.quote(form, env);
		}

		if (equal(form.first(), new Symbol("syntax-quote"))) {
			return analyse.syntax_quote(form, env);
		}

		if (equal(form.first(), new Symbol("if"))) {
			return analyse.if(form, env);
		}

		if (equal(form.first(), new Symbol("fn"))) {
			return analyse.fn(form, env);
		}

		if (equal(form.first(), new Symbol("def"))) {
			return analyse.def(form, env);
		}

		if (equal(form.first(), new Symbol("macro"))) {
			return analyse.macro(form, env);
		}

		return new Procedure(
			form.map(function (f) { return analyse(f, env); })
		);
	}

	return form;
};

analyse.quote = function (form, env) {
	return new Quote(form.second());
};

var syntax_expand = function (form, env) {
	// console.log(format("Expanding: %s", form));
	if (form instanceof List) {
		if (equal(form.first(), new Symbol("unquote"))) {
			assert.equal(2, form.count(), "unquote takes exactly one argument.");
			return new Unquote(analyse(form.second(), env));
		}

		if (equal(form.first(), new Symbol("unquote-splicing"))) {
			assert.equal(2, form.count(), "unquote-splicing takes exactly one argument.");
			return new UnquoteSplicing(analyse(form.second(), env));
		}

		return form.map(function (f) { return syntax_expand(f, env); });
	}

	return form;
};

analyse.syntax_quote = function (form, env) {
	assert.equal(2, form.count(), "syntax-quote takes exactly one argument.");
	return new SyntaxQuote(syntax_expand(form.second(), env));
};

analyse.if = function (form, env) {
	return new CrispIf(
		analyse(form.second(), env),
		analyse(form.third(), env),
		analyse(form.fourth(), env)
	);
};

analyse.def = function (form, env) {
	assert.equal(3, form.count(), "def takes exactly two arguments.");
	var name = analyse(form.second(), env),
		value = analyse(form.third(), env);

	assert.equal(true, name instanceof Symbol, "First argument to def must be a symbol.");
	return new CrispDef(name, value);
};

analyse.sequence = function (forms, env) {
	return forms.map(function (form) { return analyse(form, env); });
};

analyse.fn = function (form, env) {
	return new Lambda(
		form.second(),
		undefined,
		analyse.sequence(form.rest().rest(), env),
		env
	);
};

analyse.macro = function (form, env) {
	var macro = new Macro(
		form.second(),
		new List([]),
		analyse.sequence(form.rest().rest(), env)
	);
	return macro;
};

// Primitives must be functions that will take compiled args, and return a compiled whole.
var primitives = {};
primitives[new Symbol("+")] = function (args) {return format("(%s)", args.join(" + "));};
primitives[new Symbol("-")] = function (args) {return format("(%s)", args.join(" - "));};
primitives[new Symbol("*")] = function (args) {return format("(%s)", args.join(" * "));};
primitives[new Symbol("/")] = function (args) {return format("(%s)", args.join(" / "));};
primitives[new Symbol("=")] = function (args) {return format("equal(%s)", args.join(", "));};
primitives[new Symbol("or")] = function (args) {return args.join(" || ");};
primitives[new Symbol("and")] = function (args) {return args.join(" and ");};
primitives[new Symbol("instanceof")] = function (args) {
	assert.equal(2, args.count(), "instanceof takes exactly two arguments. Got: " + args.count());
	return args.join(" instanceof ");
};
primitives[new Symbol("typeof")] = function (args) {
	assert.equal(1, args.count(), "typeof takes exactly one argument. Got: " + args.count());
	return "typeof " + args.first();
};
primitives[new Symbol("not")] = function (args) {
	assert.equal(1, args.count(), "not takes exactly one argument. Got: " + args.count());
	return "!" + args.first();
};
primitives[new Symbol("aset")] = function (args) {
	assert.equal(2, args.count(), "aset takes exactly two arguments. Got: " + args.count());
	return format("%s = %s", args.first(), args.second());
};

var macros = {};

var compile = function compile(form, env) {
	var head, args, stored, compiled_args, compiled_name, compiled_value, expanded, match, new_head;

	if (form instanceof CrispNumber)  { return form.toString(); }
	if (form instanceof CrispBoolean) { return form.toString(); }
	if (form instanceof CrispString)  { return form.toString(); }
	if (form instanceof Symbol) {
		expanded = form.toString();

		match = /(.*)\?$/.exec(expanded);
		if (match) {
			expanded = "is_" + match[1];
		}

		expanded = expanded.replace(/-/g, "_");
		expanded = expanded.replace(/!/g, "BANG");

		return format("%s", expanded);
	}

	if (form instanceof Vector) {
		return format("[%s]", form.items.join(", "));
	}

	if (form instanceof Quote) {
		return compile.quote(form.item, env);
	}

	if (form instanceof SyntaxQuote) {
		return compile.syntax_quote(form.item, env);
	}

	if (form instanceof CrispIf) {
		return format(
			"%s ? %s : %s",
			compile(form.test_form, env),
			compile(form.then_form, env),
			compile(form.else_form, env)
		);
	}

	if (form instanceof CrispDef) {
		compiled_name = compile(form.name, env);
		compiled_value = compile(form.value, env);

		if (
			form.value instanceof Macro
		) {
			macros[compiled_name] = eval(compiled_value);
			return format("// Defined Macro: %s", compiled_name);
		}

		return format(
			"var %s = %s",
			compiled_name,
			compiled_value
		);
	}

	if (
		form instanceof Macro
		||
		form instanceof Lambda
	) {
		return format(
			"(function (%s) {\n\treturn %s;\n})",
			form.args,
			compile.sequence(form.body, form.env)
		);
	}

	if (form instanceof Procedure) {
		head = form.forms.first();
		args = form.forms.rest();

		compiled_args = args.map(function (f) { return compile(f, env); });

		// TODO True is expanding into the string, rather than the symbol. Hmm...
		stored = macros[head];
		if (typeof stored !== 'undefined') {
			expanded = stored.apply(env, args.items); // TODO, in the apply call, what should this be?
			return compile(analyse(expanded, env), env);
		}

		stored = primitives[head];
		if (typeof stored !== 'undefined') {
			return format("%s", stored(compiled_args));
		}

		// Interop.
		if (head instanceof Symbol) {
			match = /(.*)\.$/.exec(head.name);
			if (match) {
				return format("new %s(%s)", compile(new Symbol(match[1]), env), compiled_args.join(", "));
			}

			match = /^.-(.*)/.exec(head.name);
			if (match) {
				assert.equal(1, args.count(), "property access takes exactly one argument.");
				return format("%s.%s", compiled_args.first(), compile(new Symbol(match[1]), env));
			}

			match = /^\.(.*)/.exec(head.name);
			if (match) {
				return format(
					"%s.%s(%s)",
					compiled_args.first(),
					compile(new Symbol(match[1], env)),
					compiled_args.rest().join(", ")
				);
			}
		}

		return format("%s(%s)", compile(head, env), compiled_args.join(", "));
	}

	throw new Error(format("Unhandled compilation for form: %j (%s)", form, typeof form));
};

compile.sequence = function (forms, env) {
	return forms.map(function (form) { return compile(form, env); }).join(",");
};

compile.quote_atom = function (form, env) {
	if (form instanceof CrispNumber) {
		return format("new CrispNumber(%s)", form);
	}

	if (form instanceof CrispBoolean) {
		return format("new CrispBoolean(%s)", form);
	}

	if (form instanceof CrispString) {
		return format("new CrispString(%s)", form);
	}

	if (form instanceof Symbol) {
		return format('new Symbol("%s")', form);
	}

	throw new Error(format("Unhandled compilation for quoted form: %j", form));
};

compile.quote = function (form, env) {
	if (form instanceof List) {
		return format("new List([%s])", form.map(function (f) { return compile.quote(f, env); }).join(", "));
	}

	if (form instanceof Vector) {
		return format("new Vector([%s])", form.map(function (f) { return compile.quote(f, env); }).join(", "));
	}

	return compile.quote_atom(form, env);
};

compile.syntax_quote = function (form, env) {
	if (form instanceof List) {
		// TODO We can't map. We Must peek.
		var i, items = [], sub_item, compiled_sub_item;
		for (i = 0; i < form.count(); i++) {
			sub_item = form.nth(i);

			// if (sub_item instanceof UnquoteSplicing) {
			// 	compiled_sub_item = compile.sequence(sub_item.item, env);
			// 	items = items.concat(compiled_sub_item);
			// } else {
			// }
				compiled_sub_item = compile.syntax_quote(sub_item, env);
				items.push(compiled_sub_item);
		}

		return format("new List([%s])", items.join(", "));
	}

	if (form instanceof Vector) {
		return format("new Vector([%s])", form.map(function (f) { return compile.syntax_quote(f, env); }).join(", "));
	}

	if (form instanceof Unquote) {
		return compile(form.item, env);
	}

	if (form instanceof UnquoteSplicing) {
		// TODO
		return compile(form.item, env);
	}

	return compile.quote_atom(form, env);
};

var preamble = function () {
	return [
		"// START",
		'"use strict";\n',
		"var CrispBoolean = require('../lib/types').CrispBoolean;",
		"var CrispString = require('../lib/types').CrispString;",
		"var CrispNumber = require('../lib/types').CrispNumber;",
		"var Keyword = require('../lib/types').Keyword;",
		"var List = require('../lib/types').List;",
		"var Symbol = require('../lib/types').Symbol;",
		"var Vector = require('../lib/types').Vector;",
		"var equal = require('deep-equal');",
		"var format = require('util').format;",
		"",
		"",
	].join("\n");
};

var postamble = function () {
	return [
		"// END",
		"",
	].join("\n");
};

var compile_string = function (input, env) {
	var read, analysis, compiled, result;

	result = [];

	while (input !== "") {
		read = read_string(input);
		input = read.remainder;

		if (
			read.type !== "WHITESPACE"
			&&
			read.type !== "COMMENT"
		) {
			analysis = analyse(read.result, env);
			compiled = compile(analysis, env);
			result.push(compiled + ";\n");
		}
	}

	return result.join("\n") + "\n";
};
exports.compile_string = compile_string;

// TODO Make this asynchronous. (Easy, but making Grunt respect that is harder.)
var compile_io = function (input, output, env, callback) {
	var data = fs.readFileSync(input, {encoding: "utf-8"}),
		compiled = compile_string(data, env),
		full = preamble() + compiled + postamble();


	fs.writeFileSync(output, full);
};
exports.compile_io = compile_io;

var usage = "USAGE TODO";

var main = function () {
	assert.equal(process.argv.length, 4, usage);
	var input	 = process.argv[2],
		output	 = process.argv[3],
		env		 = {};

	compile_io(input, output, env, function () { console.log("Done"); });
};

if (require.main === module) {
    main();
}

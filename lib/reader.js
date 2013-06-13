"use strict";

var crisp = {
	types: require('./types')
};

function make_parser(regexp, type) {
	return function (string) {
		var re_match = regexp.exec(string),
			new_string;
		if (re_match && re_match[0] !== undefined) {
			new_string = string.replace(re_match[0], "");
			return {
				result: re_match.shift(),
				groups: re_match,
				type: type,
				remainder: new_string
			};
		}
	};
}

var match_open_parenthesis	= make_parser(/^\(/, 'OPEN_PARENTHESIS');
var match_close_parenthesis = make_parser(/^\)/, 'CLOSE_PARENTHESIS');
var match_open_bracket		= make_parser(/^\[/, 'OPEN_BRACKET');
var match_close_bracket		= make_parser(/^\]/, 'CLOSE_BRACKET');
var match_open_brace		= make_parser(/^\{/, 'OPEN_BRACE');
var match_close_brace		= make_parser(/^\}/, 'CLOSE_BRACE');
var match_number			= make_parser(/^-?\d+(\.\d+)?/, 'NUMBER');

var match_string			= make_parser(/^"([^"\\]*(\\["nt\\][^"\\]*)*)"/m, 'STRING');
var match_regexp			= make_parser(/^#"([^"\\]*(\\["ntsw\[\]()\\][^"\\]*)*)"/m, 'REGEXP');

var match_boolean			= make_parser(/^(true|false)\b/, 'BOOLEAN');

var match_symbol			= make_parser( /^([^\s\[\](){}]+)/, 'SYMBOL');
var match_keyword			= make_parser(/^:([^\s\[\](){}]+)/, 'KEYWORD');

var match_whitespace		= make_parser(/^\s+/, 'WHITESPACE');
var match_comment			= make_parser(/^;(.*)/, 'COMMENT');
var match_quote				= make_parser(/^'/, 'QUOTE');
var match_syntax_quote		= make_parser(/^`/, 'SYNTAX_QUOTE');
var match_unquote_splicing	= make_parser(/^~@/, 'UNQUOTE_SPLICING');
var match_unquote			= make_parser(/^~/, 'UNQUOTE');

function read_until(closing_matcher, string) {
	var forms = [],
		match,
		remaining_string = string,
		error;

	while (true) {
		match = closing_matcher(remaining_string);
		if (match) {
			return {
				result: forms,
				remainder: match.remainder
			};
		}

		match = read_string(remaining_string);
		if (match) {
			if (
				match.type !== 'WHITESPACE'
				&&
				match.type !== 'COMMENT'
			) {
				forms.push(match.result);
			}
			remaining_string = match.remainder;
		}

		if (remaining_string === "") {
			error = new Error("Unbalanced form.");
			error.type = "UnbalancedForm";
			throw error;
		}
	}
}

function read_string(string) {
	var line = 0,
		col = 0,
		match;

	// Quote.
	match = match_quote(string);
	if (match) {
		match = read_string(match.remainder);
		match.result = new crisp.types.List([new crisp.types.Symbol("quote"), match.result]);
		return match;
	}


	// Syntax-Quote.
	match = match_syntax_quote(string);
	if (match) {
		match = read_string(match.remainder);
		match.result = new crisp.types.List([new crisp.types.Symbol("syntax-quote"), match.result]);
		return match;
	}

	// Unquote-Splicing.
	match = match_unquote_splicing(string);
	if (match) {
		match = read_string(match.remainder);
		match.result = new crisp.types.List([new crisp.types.Symbol("unquote-splicing"), match.result]);
		return match;
	}

	// Unquote.
	match = match_unquote(string);
	if (match) {
		match = read_string(match.remainder);
		match.result = new crisp.types.List([new crisp.types.Symbol("unquote"), match.result]);
		return match;
	}

	// Lists.
	match = match_open_parenthesis(string);
	if (match) {
		match = read_until(match_close_parenthesis, match.remainder);
		match.result = new crisp.types.List(match.result);
		return match;
	}

	// Arrays.
	match = match_open_bracket(string);
	if (match) {
		match = read_until(match_close_bracket, match.remainder);
		return match;
	}

	// Maps.
	match = match_open_brace(string);
	if (match) {
		match = read_until(match_close_brace, match.remainder);
		match.result = new crisp.types.cons(
			new crisp.types.Symbol("crisp.types.HashMap."),
			match.result
		);
		return match;
	}

	// Numbers.
	match = match_number(string);
	if (match) {
		match.result = parseFloat(match.result);
		return match;
	}

	// Boolean.
	match = match_boolean(string);
	if (match) {
		match.result = (match.result === 'true');
		return match;
	}

	// Regexps.
	match = match_regexp(string);
	if (match) {
		match.result = new crisp.types.List([
			new crisp.types.Symbol("RegExp."),
			match.groups[0]
		]);
		return match;
	}

	// Strings.
	match = match_string(string);
	if (match) {
		match.result = match.groups[0];
		match.result = match.result.replace(/\\n/g, "\n");
		match.result = match.result.replace(/\\t/g, "\t");
		match.result = match.result.replace(/\\"/g, '"');
		return match;
	}

	// Keywords.
	match = match_keyword(string);
	if (match) {
		match.result = new crisp.types.Keyword(match.groups[0]);
		return match;
	}

	// Comment.
	match = match_comment(string);
	if (match) {
		return match;
	}

	// Symbols.
	match = match_symbol(string);
	if (match) {
		match.result = new crisp.types.Symbol(match.result);
		return match;
	}

	// Whitespace.
	match = match_whitespace(string);
	if (match) {
		return match;
	}

	throw new Error("Can't parse: " + string);
}
exports.read_string = read_string;

var read = function (string) {
	var form = read_string(string);
	if (form !== undefined) {
		return form.result;
	}
};
exports.read = read;

"use strict";

var Symbol = require('./runtime').Symbol;
var Keyword = require('./runtime').Keyword;

function make_parser(regexp, type) {
	return function (string) {
		var re_match = regexp.exec(string),
			new_string;
		if (re_match && typeof(re_match[0]) !== 'undefined') {
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
var match_string			= make_parser(/^"([^"]*)"/m, 'STRING');
var match_keyword			= make_parser(/^:([\w_\-\+!=?\*]+)/, 'KEYWORD');
var match_symbol			= make_parser(/^[\w\._\/\-\+!=?\*]+/, 'SYMBOL');
var match_whitespace		= make_parser(/^\s+/, 'WHITESPACE');

function read_until(closing_matcher, string) {
	var forms = [],
		match,
		remaining_string = string;

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
			if (match.type !== 'WHITESPACE') {
				forms.push(match.result);
			}
			remaining_string = match.remainder;
		}

		if (remaining_string === "" ) {
			console.log("Forms", forms);
			throw "Out of string!";
		}
	}
}

function read_string(string) {
	var line = 0,
		col = 0,
		match;

	// Lists.
	match = match_open_parenthesis(string);
	if (match) {
		match = read_until(match_close_parenthesis, match.remainder);
		return match;
	}
	
	// Vectors.
	match = match_open_bracket(string);
	if (match) {
		match = read_until(match_close_bracket, match.remainder);
		match.result.unshift(new Symbol("vec"));
		return match;
	}
	
	// Maps.
	match = match_open_brace(string);
	if (match) {
		match = read_until(match_close_brace, match.remainder);
		match.result.unshift(new Symbol("hash-map"));
		return match;
	}
	
	// Numbers.
	match = match_number(string);
	if (match) {
		match.result = parseFloat(match.result);
		return match;
	}

	// Strings.
	match = match_string(string);
	if (match) {
		match.result = match.groups[0];
		return match;
	}

	// Keywords.
	match = match_keyword(string);
	if (match) {
		match.result = new Keyword(match.groups[0]);
		return match;
	}

	// Symbols.
	match = match_symbol(string);
	if (match) {
		match.result = new Symbol(match.result);
		return match;
	}

	// Whitespace.
	match = match_whitespace(string);
	if (match) {
		return match;
	}

	throw "Can't parse: " + string;
}
exports.read_string = read_string;

var read = function (string) {
	var form = read_string(string);
	if (typeof(form) !== 'undefined') {
		return form.result;
	}
};
exports.read = read;

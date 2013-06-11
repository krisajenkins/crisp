/*global describe: true, it: true, beforeEach: true */
"use strict";

var vm			= require('vm');

var crisp		= require('../build/crisp');
var Symbol		= crisp.types.Symbol;
var Keyword		= crisp.types.Keyword;
var List		= crisp.types.List;
var cons		= crisp.types.cons;

var ast			= require('../build/ast');
var compiler	= require('../build/compiler');
var testutils	= require('./testutils');
var assertEq	= testutils.assertEq;
var runIn		= testutils.runIn;
var compilesTo	= testutils.compilesTo;
var kompilesTo	= testutils.kompilesTo;

describe('compiler', function () {
	var env;

	beforeEach(function () {
		var types = require('../build/types');
		env = vm.createContext(compiler.create_env());
		vm.runInContext("crisp.types.patch_array_prototype(Array)", env);
	});

	/*
	it('multifn', function () {
		runIn("(defn2 multi ([x] 1) ([x y] 2) ([x y & more] 0))", true, env);

		compilesTo("(multi :a)", 1, env);
		compilesTo("(multi :a :b)", 2, env);
		compilesTo("(multi :a :b :c :d)", 0, env);
	});
	*/

});

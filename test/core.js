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

	it('contains?', function () {
		compilesTo("(contains? '& '[x y])", false, env);
		compilesTo("(contains? '& '[x y & more])", true, env);
	});

	it('interleave', function () {
		compilesTo("(interleave [1 2 3] [4 5 6])", [1, 4, 2, 5, 3, 6], env);
		compilesTo("(interleave [1 2 3] [])", [], env);
		compilesTo("(interleave [1 2 3] [4 5 6 7 8 9])", [1, 4, 2, 5, 3, 6], env);
	});

	it('argcount', function () {
		compilesTo("(argcount '[x y])", 2, env);
		compilesTo("(argcount '[x y & more])", 3, env);
	});

	it('binds?', function () {
		compilesTo("(binds? '[] [])", true, env);
		compilesTo("(binds? '[] [1])", false, env);
		compilesTo("(binds? '[] [1 2])", false, env);

		compilesTo("(binds? '[x y] [1 2])", true, env);
		compilesTo("(binds? '[x y] [1])", false, env);
		compilesTo("(binds? '[x y] [1 2 3])", false, env);

		compilesTo("(binds? '[& xs] [1 2])", true, env);
		compilesTo("(binds? '[& xs] [1])", true, env);

		compilesTo("(argcount '[x y & more])", 3, env);
	});

	it('multifn', function () {
		runIn("(defn single [x] 1)", false, env);
		runIn("(defn multi ([] 0) ([x] 1) ([x y] 2) ([x y & more] :many))", false, env);

		compilesTo("(single :a)", 1, env);
		compilesTo("(multi)", 0, env);
		compilesTo("(multi :a)", 1, env);
		compilesTo("(multi :a :b)", 2, env);
		compilesTo("(multi :a :b :c :d)", "many", env);
		compilesTo("(multi :a :b :c :d :e)", "many", env);
	});
});

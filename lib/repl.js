var crisp = require('./crisp');
var vm = require('vm');
exports.vm = vm;
var escodegen = require('escodegen');
exports.escodegen = escodegen;
var repl = require('repl');
exports.repl = repl;
var compiler = require('./compiler');
exports.compiler = compiler;
var reader = require('./reader');
exports.reader = reader;
var make_eval = function () {
	return function (env) {
		return function (command) {
			return function () {
				return function (string, _, _, callback) {
					command = command + string.slice(1, -1);
					return function () {
						try {
							return function (tree) {
								return function (compiled) {
									return function (result) {
										return function () {
											command = '';
											return callback(null, result);
										}();
									}(vm.runInNewContext(compiled, env));
								}(escodegen.generate(tree));
							}(compiler.compile_string(command, env));
						} catch (e) {
							return crisp.core.equal(e.type, 'UnbalancedForm') ? callback(null, undefined) : function () {
								command = '';
								return callback(null, e);
							}();
						}
					}();
				};
			}();
		}('');
	}(compiler.create_env());
};
exports.make_eval = make_eval;
var start_repl = function () {
	return repl.start(new crisp.types.HashMap("prompt", '=> ', "eval", make_eval(), "terminal", false, "ignoreUndefined", true, "useColors", true, "useGlobal", false));
};
exports.start_repl = start_repl;
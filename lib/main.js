var repl = require('./repl');
var assert = require('assert');
var compiler = require('./compiler');

var usage = "USAGE: <input> <output>";

var main = function () {
	if (process.argv.length === 2) {
		// REPL.
		repl.start_repl();
	} else {
		// Compiler.
		assert.equal(process.argv.length, 4, usage);
		var input	= process.argv[2],
		output		= process.argv[3],
		env			= compiler.create_env();

		compiler.compile_io(input, output, env, function () { console.log("Done"); });
	}
};
exports.main = main;

if (require.main === module) {
    main();
}

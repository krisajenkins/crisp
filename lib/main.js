var repl = require('./repl');
var compiler = require('./compiler');

var main = function () {
	if (process.argv.length === 2) {
		// REPL.
		repl.start_repl();
	} else {
		// Compiler.
		assert.equal(process.argv.length, 4, usage);
		var input	= process.argv[2],
		output		= process.argv[3],
		env			= create_env();

		compile_io(input, output, env, function () { console.log("Done"); });
	}
};
exports.main = main;

if (require.main === module) {
    main();
}

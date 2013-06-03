/*global document: true*/
"use strict";

var compiler = require('./compiler');
var crisp = require('./crisp');
var escodegen = require('escodegen');

var links = document.getElementsByTagName('script');
var env = compiler.create_env();
var block, tree, compiled, i;

for (i = 0; i < links.length; i++) {
	block = links[i];
	if (block.type === 'text/crisp') {
		tree = compiler.compile_string(block.innerText, env);
		compiled = escodegen.generate(tree);
		eval(compiled);
	}
}

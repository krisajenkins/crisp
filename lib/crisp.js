"use strict";

var reader = require("./reader");

function main() {
	var form;
	
	console.log("START");
	form = reader.read_string("5\n2\n");
	console.log("Form", form);

	form = reader.read_string("()\n");
	console.log("Form", form);

	form = reader.read_string("(+ 1 2)\n");
	console.log("Form", form);

	console.log("END");
}
exports.main = main;

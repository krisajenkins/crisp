"use strict";

var encode = {
	expression: function (expression) { return {type: 'ExpressionStatement', expression: expression}; },
	literal: function (value) { return {type: 'Literal', value: value}; },
	array: function (elements) { return {type: 'ArrayExpression', elements: elements}; },
	call: function (callee, args) {
		return {
			type: 'CallExpression',
			callee: callee,
			'arguments': args,
		};
	},
	'new': function (callee, args) {
		return {
			type: 'NewExpression',
			callee: callee,
			'arguments': args,
		};
	},
	'return': function (value) { return {type: 'ReturnStatement', argument: value}; },

	member: function (object, property) {
		return {
			type: 'MemberExpression',
			computed: false,
			object: object,
			property: property
		};
	},


	argument_splice: function (name, index) {
		return encode.variable(
			name,
			encode.call(
				encode.member(
					encode.member(
						encode.member(
							encode.identifier('Array'),
							encode.identifier('prototype')
						),
						encode.identifier('slice')
					),
					encode.identifier('call')
				),
				[
					encode.identifier('arguments'),
					index
				]
			)
		);
	},

	assignment: function (name, value) {
		return {
			type: 'AssignmentExpression',
			operator: '=',
			left: name,
			right: value
		};
	},

	export: function (name) {
		return encode.assignment(
			encode.member(
				encode.identifier('exports'),
				name
			),
			name
		);
	},

	unary: function (operator, argument, prefix) {
		return {
			type: 'UnaryExpression',
			operator: operator,
			argument: argument,
			prefix: prefix
		};
	},
	binary: function (operator, left, right) {
		return {
			type: 'BinaryExpression',
			operator: operator,
			left: left,
			right: right
		};
	},
	logical: function (operator, left, right) {
		return {
			type: 'LogicalExpression',
			operator: operator,
			left: left,
			right: right
		};
	},
	block: function (body) {
		if (! body instanceof Array) {
			body = [body];
		}

		return {
			type: 'BlockStatement',
			body: body,
		};
	},
	program: function (body) {
		return {type: 'Program', body: body};
	},
	identifier: function (name) {
		return {
			type: 'Identifier',
			name: name,
		};
	},
	variable: function (name, value) {
		return {
			type: 'VariableDeclaration',
			kind: 'var',
			declarations: [{
				type: 'VariableDeclarator',
				id: name,
				init: value,
			}],
		};
	},
	conditional: function (test, consequent, alternate) {
		return {
			type: 'ConditionalExpression',
			test: test,
			consequent: consequent,
			alternate: alternate
		};
	},

	// Lesser languages make a distinction between expressions and statements.
	box: function (expression) {
		// Box.
		if (
			expression.type === "Literal"
				||
				expression.type === "Identifier"
				||
				expression.type === "MemberExpression"
				||
				expression.type === "ConditionalExpression"
				||
				expression.type === "AssignmentExpression"
				||
				expression.type === "CallExpression"
				||
				expression.type === "ArrayExpression"
				||
				expression.type === "NewExpression"
				||
				expression.type === "FunctionExpression"
				||
				expression.type === "UnaryExpression"
				||
				expression.type === "BinaryExpression"
				||
				expression.type === "LogicalExpression"
		) {
			return encode.expression(expression);
		}

		return expression;
	}
};
exports.encode = encode;

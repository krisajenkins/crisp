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

	object: function (object) {
		var key, properties = [];

		for (key in object) {
			if (object.hasOwnProperty(key)) {
				properties.push(
					encode.property(
						encode.identifier(key),
						encode.literal(object[key])
					)
				);
			}
		}

		return {
			type: 'ObjectExpression',
			properties: properties
		};
	},

	property: function(key, value) {
		return {
			type: 'Property',
			key: key,
			value: value,
			kind: 'init'
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

	'function': function (params, body) {
		return {
			type: 'FunctionExpression',
			id: null,
			params: params,
			defaults: [],
			body: body,
			rest: null,
			generator: false,
			expression: false
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
	},

	'try': function (body, catch_clause, finally_clause) {
		return {
			type: 'TryStatement',
			block: body,
			guardedHandlers: [],
			handlers: [catch_clause],
			finalizer: finally_clause,
		};
	},

	'throw': function (arg) {
		return {
			type: 'ThrowStatement',
			argument: arg,
		};
	},

	'catch': function (param, body) {
		return {
			type: 'CatchClause',
			param: param,
			body: body,
		};
	}
};
exports.encode = encode;

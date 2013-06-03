var crisp = require('./crisp');
var http = require('http');
exports.http = http;
var handler = function (request, response) {
	return function (G__1) {
		return function () {
			G__1.writeHead(200, new crisp.types.HashMap("Content-Type", 'text/plain'));
			G__1.end('Hello World\n');
			return G__1;
		}();
	}(response);
};
exports.handler = handler;
var server = http.createServer(handler);
exports.server = server;
server.listen(1337, '127.0.0.1');
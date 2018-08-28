/*
 * Primary file for the API
 */

const http = require('http');
const url = require('url');
const { StringDecoder } = require('string_decoder');

const server = http.createServer((req, res) => {

    var parsedUrl = url.parse(req.url, true);
    var path = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');
    var method = req.method.toLowerCase();
    var queryStringObject = parsedUrl.query;
    var headers = req.headers;

    var decoder = new StringDecoder('utf8');
    var buffer = '';
    req.on('data', (data) => {
        buffer += decoder.write(data);
    });

    req.on('end', () => {
        buffer += decoder.end();

        var chosenHandler = typeof(routes[path]) !== 'undefined' ? routes[path] : handlers.notFound;

        const data = {
            path,
            queryStringObject,
            method,
            headers,
            'payload': buffer
        };

        chosenHandler(data, function(statusCode, payload) {
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
            payload = typeof(payload) == 'object' ? payload : {};

            var payloadString = JSON.stringify(payload);
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);
            console.log('Returning this response : ', statusCode, payloadString);
        });
    });
}).listen(3000, () => {
    console.log(`Server is listening on port 3000...`);
});

var handlers = {};

handlers.sample = function(data, callback) {
    callback(200, { 'Message': 'Hello World!!!' });
}

handlers.notFound = function(data, callback) {
    callback(404);
}

var routes = {
    'sample': handlers.sample
}
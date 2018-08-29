/*
 * Primary file for the API
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const { StringDecoder } = require('string_decoder');
const config = require('./config');
const pingHandler = require('./routes/ping');

const httpServer = http.createServer((req, res) => {
    unifiedServer(req, res);
}).listen(config.httpPort, () => {
    console.log(`Server is listening on port ${config.httpPort} in ${config.envName} mode...`);
});

const httpsServer = https.createServer({
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
}, (req, res) => {
    unifiedServer(req, res);
}).listen(config.httpsPort, () => {
    console.log(`Server is listening on port ${config.httpsPort} in ${config.envName} mode...`);
});

function unifiedServer(req, res) {
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

        var chosenHandler = typeof(routes[path]) !== 'undefined' ? routes[path] : handler.notFound;

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
}

var handler = {
    'notFound': function(data, callback) {
        callback(404);
    }
};

var routes = {
    'ping': pingHandler.ping
}
/*
 * Server-related tasks
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { StringDecoder } = require('string_decoder');
const config = require('./config');
const helpers = require('./helpers');
const pingHandler = require('../routes/ping');
const usersHandler = require('../routes/users');
const tokensHandler = require('../routes/tokens');
const checksHandler = require('../routes/checks');

// Testing twilio
// helpers.sendTwilioSms('8018156622', 'Hello', function(err) {
//     console.log('This was the error ', err);
// });

var server = {};

server.httpServer = http.createServer((req, res) => {
    server.unifiedServer(req, res);
});

server.httpsServer = https.createServer({
    'key': fs.readFileSync(path.join(__dirname, '../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '../https/cert.pem'))
}, (req, res) => {
    server.unifiedServer(req, res);
});

server.unifiedServer = function(req, res) {
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

        var chosenHandler = typeof(server.routes[path]) !== 'undefined' ? server.routes[path] : server.handler.notFound;

        const data = {
            path,
            queryStringObject,
            method,
            headers,
            'payload': helpers.parseJsonToObject(buffer)
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
};

server.handler = {
    'notFound': function(data, callback) {
        callback(404, { 'Message': 'Router not defined' });
    }
};

server.routes = {
    'ping': pingHandler.ping,
    'users': usersHandler.users,
    'tokens': tokensHandler.tokens,
    'checks': checksHandler.checks
};

server.init = function() {
    server.httpServer.listen(config.httpPort, () => {
        console.log('\x1b[33m%s\x1b[0m', `Server is listening on port ${config.httpPort} in ${config.envName} mode...`);
    });
    server.httpsServer.listen(config.httpsPort, () => {
        console.log('\x1b[33m%s\x1b[0m', `Server is listening on port ${config.httpsPort} in ${config.envName} mode...`);
    });
};

module.exports = server;
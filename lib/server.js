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
const viewHandlers = require('../assets/routes');
const util = require('util');
const debug = util.debuglog('server');

// Testing twilio
// helpers.sendTwilioSms('8018156622', 'Hello', function(err) {
//     debug('This was the error ', err);
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

        chosenHandler(data, function(statusCode, payload, contentType) {
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
            contentType = typeof(contentType) == 'string' ? contentType : 'json';

            var payloadString = '';
            if (contentType == 'json') {
                res.setHeader('Content-Type', 'application/json');
                payload = typeof(payload) == 'object' ? payload : {};
                payloadString = JSON.stringify(payload);
            }
            if (contentType == 'html') {
                res.setHeader('Content-Type', 'text/html');
                payloadString = typeof(payload) == 'string' ? payload : '';
            }
            res.writeHead(statusCode);
            res.end(payloadString);

            if (statusCode == 200)
                debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + ' /' + path + ' ' + statusCode);
            else
                debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + ' /' + path + ' ' + statusCode);

        });
    });
};

server.handler = {
    'notFound': function(data, callback) {
        callback(404, { 'Message': 'Router not defined' });
    }
};

server.routes = {
    '': viewHandlers.index,
    'account/create': viewHandlers.accountCreate,
    'account/edit': viewHandlers.accountEdit,
    'account/deleted': viewHandlers.accountDeleted,
    'session/create': viewHandlers.sessionCreate,
    'session/deleted': viewHandlers.sessionDeleted,
    'checks/all': viewHandlers.checksList,
    'checks/create': viewHandlers.checksCreate,
    'checks/edit': viewHandlers.checksEdit,
    'ping': pingHandler.ping,
    'api/users': usersHandler.users,
    'api/tokens': tokensHandler.tokens,
    'api/checks': checksHandler.checks
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
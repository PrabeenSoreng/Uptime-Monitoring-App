/*
 * Ping router (/ping)
 */

var handlers = {};

handlers.ping = function(data, callback) {
    callback(200, { 'Message': 'Hello World!!!' });
}

handlers.notFound = function(data, callback) {
    callback(404);
}

module.exports = handlers;
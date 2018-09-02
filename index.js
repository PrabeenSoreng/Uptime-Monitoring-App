/*
 * Primary file for the API
 */

const server = require('./lib/server');
const workers = require('./lib/workers');

var app = {};

app.init = function() {
    server.init();
    workers.init();
};

app.init();

module.exports = app;
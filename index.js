/*
 * Primary file for the API
 */

const server = require('./lib/server');
const workers = require('./lib/workers');

var app = {};

app.init = function() {
    console.log('\x1b[36m%s\x1b[0m', 'Background workers are running...');
    server.init();
    workers.init();
};

app.init();

module.exports = app;
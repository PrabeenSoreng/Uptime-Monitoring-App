/*
 * HTML Handlers
 */

const helpers = require('../lib/helpers');


var viewHandlers = {};

// Index Handler
viewHandlers.index = function(data, callback) {
    if (data.method == 'get') {
        helpers.getTemplate('index', function(err, str) {
            if (!err && str) callback(200, str, 'html');
            else callback(500, undefined, 'html');
        });
    } else callback(405, undefined, 'html');
}



module.exports = viewHandlers;
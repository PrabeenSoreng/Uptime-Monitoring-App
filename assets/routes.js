/*
 * HTML Handlers
 */

const helpers = require('../lib/helpers');


var viewHandlers = {};

// Index Handler
viewHandlers.index = function(data, callback) {
    if (data.method == 'get') {
        var templateData = {
            'head.title': 'This is the title',
            'head.description': 'This is the description',
            'body.class': 'index'
        }
        helpers.getTemplate('index', templateData, function(err, str) {
            if (!err && str) {
                helpers.addUniversalTemplates(str, templateData, function(err, fullString) {
                    if (!err && fullString) callback(200, fullString, 'html');
                    else callback(500, undefined, 'html');
                });
            } else callback(500, undefined, 'html');
        });
    } else callback(405, undefined, 'html');
}



module.exports = viewHandlers;
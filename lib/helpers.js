/*
 * Helpers library
 */

const crypto = require('crypto');
const config = require('./config');

var helpers = {};

// Create a SHA256 hash
helpers.hash = function(str) {
    if (typeof(str) == 'string' && str.length > 0) {
        var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
};

// Parse a Json string to an object in all cases
helpers.parseJsonToObject = function(str) {
    try {
        var obj = JSON.parse(str);
        return obj;
    } catch (e) {
        return {};
    }
};

// Create a string of alphanumeric character of a given length
helpers.randomString = function(strLength) {
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    if (strLength) {
        console.log(strLength);
        var characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        var str = '';
        for (i = 1; i <= strLength; i++) {
            var randomStr = characters.charAt(Math.floor(Math.random() * characters.length));
            str += randomStr;
        }
        return str;
    } else return false;
};


module.exports = helpers;
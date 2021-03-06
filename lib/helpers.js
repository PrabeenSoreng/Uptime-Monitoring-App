/*
 * Helpers library
 */

const crypto = require('crypto');
const querystring = require('querystring');
const https = require('https');
const config = require('./config');
const path = require('path');
const fs = require('fs');

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

// twillio library
helpers.sendTwilioSms = function(phone, msg, callback) {
    var phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    var msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;

    if (phone && msg) {
        var payload = {
            'From': config.twilio.fromPhone,
            'To': '+1' + phone,
            'Body': msg
        };
        var stringPayload = querystring.stringify(payload);
        var requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
            'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        };

        var req = https.request(requestDetails, function(res) {
            var status = res.statusCode;
            if (status == 200 || status == 201) callback(false);
            else callback('Status code returned was ' + status);
        });

        req.on('error', function(e) {
            callback(e);
        });
        req.write(stringPayload);
        req.end();

    } else callback('Given parameter are missing or invalid');
};

// Get the string content of a template
helpers.getTemplate = function(templateName, data, callback) {
    templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
    data = typeof(data) == 'object' && data !== null ? data : {};

    if (templateName) {
        var templateDir = path.join(__dirname, '../assets/templates/');
        fs.readFile(templateDir + templateName + '.html', 'utf8', function(err, str) {
            if (!err && str && str.length > 0) {
                var finalString = helpers.interpolate(str, data);
                callback(false, finalString);
            } else callback("No template could be found");
        });
    }
};

helpers.addUniversalTemplates = function(str, data, callback) {
    helpers.getTemplate('_header', data, function(err, headerString) {
        if (!err && headerString) {
            helpers.getTemplate('_footer', data, function(err, footerString) {
                if (!err && footerString) {
                    var fullString = headerString + str + footerString;
                    callback(false, fullString)
                } else callback("Could not find footer string");
            });
        } else callback("Could not find the header template");
    });
};

helpers.interpolate = function(str, data) {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';

    for (let keyName in config.templateGlobals) {
        if (config.templateGlobals.hasOwnProperty(keyName))
            data['global.' + keyName] = config.templateGlobals[keyName];
    }

    for (let key in data) {
        if (data.hasOwnProperty(key) && typeof(data[key] == 'string')) {
            var replace = data[key];
            var find = '{' + key + '}';
            str = str.replace(find, replace);
        }
    }
    return str;
};


module.exports = helpers;
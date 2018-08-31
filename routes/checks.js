/*
 * Checks router (/checks)
 */

const _data = require('../lib/data');
const helpers = require('../lib/helpers');
const tokensHandler = require('./tokens');
const config = require('../lib/config');

var handlers = {};

handlers.checks = function(data, callback) {
    var methods = ['post', 'get', 'put', 'delete'];
    if (methods.indexOf(data.method) > -1)
        handlers._checks[data.method](data, callback);
    else
        callback(405);
};

handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = function(data, callback) {

    var protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 == 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (protocol && url && method && successCodes && timeoutSeconds) {
        var tokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        _data.read('tokens', tokenId, function(err, tokenData) {
            if (!err && tokenData) {
                var userPhone = tokenData.phone;
                tokensHandler._tokens.verifyToken(tokenId, userPhone, function(isValid) {
                    if (isValid) {
                        _data.read('users', userPhone, function(err, userData) {
                            if (!err && userData) {
                                var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                                if (userChecks.length < config.maxChecks) {
                                    var checkId = helpers.randomString(20);
                                    var checkObject = {
                                        'id': checkId,
                                        'phone': userPhone,
                                        protocol,
                                        url,
                                        method,
                                        successCodes,
                                        timeoutSeconds
                                    };
                                    _data.create('checks', checkId, checkObject, function(err) {
                                        if (!err) {
                                            userData.checks = userChecks;
                                            userData.checks.push(checkId);
                                            _data.update('users', userPhone, userData, function(err) {
                                                if (!err) callback(200, checkObject);
                                                else callback(500, { 'Error': 'Could not update user' });
                                            });
                                        } else callback(500, { 'Error': 'Could not persist check data' });
                                    });
                                } else callback(400, { 'Error': `Already have ${config.maxChecks} checks...` });
                            } else callback(403, { 'Error': 'Could not read user data' });
                        });
                    } else callback(403, { 'Error': 'Session ended' });
                });
            } else callback(403, { 'Error': 'Session timeout' });
        });
    } else callback(400, { 'Error': 'Missing required field' });
};

// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = function(data, callback) {

    var checkId = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    var tokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    if (checkId) {
        _data.read('checks', checkId, function(err, checkData) {
            if (!err && checkData) {
                tokensHandler._tokens.verifyToken(tokenId, checkData.phone, function(isValid) {
                    if (isValid) callback(200, checkData);
                    else callback(403, { 'Error': 'Session timeout' });
                });
            } else callback(403);
        });
    } else callback(400, { 'Error': 'Missing required field' });
};

// Checks - put
// Required data: id
// optional data: protocol, url, method, successCodes, timeoutSeconds
handlers._checks.put = function(data, callback) {

    var checkId = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    var protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 == 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (checkId) {
        if (protocol || url || method || successCodes || timeoutSeconds) {
            _data.read('checks', checkId, function(err, checkData) {
                if (!err && checkData) {
                    var tokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                    tokensHandler._tokens.verifyToken(tokenId, checkData.phone, function(isValid) {
                        if (isValid) {
                            if (protocol) checkData.protocol = protocol;
                            if (url) checkData.url = url;
                            if (method) checkData.method = method;
                            if (successCodes) checkData.successCodes = successCodes;
                            if (timeoutSeconds) checkData.timeoutSeconds = timeoutSeconds;
                            _data.update('checks', checkId, checkData, function(err) {
                                if (!err) callback(200, checkData);
                                else callback(500, { 'Error': 'Could not update' });
                            });
                        } else callback(403, { 'Error': 'Session timeout' });
                    });
                } else callback(400, { 'Error': 'Check doesnot exist' });
            });
        } else callback(400, { 'Error': 'Missing fields to update' });
    } else callback(400, { 'Error': 'Missing required field' });
};

// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = function(data, callback) {

    var checkId = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    var tokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    if (checkId) {
        _data.read('checks', checkId, function(err, checkData) {
            if (!err && checkData) {
                tokensHandler._tokens.verifyToken(tokenId, checkData.phone, function(isValid) {
                    if (isValid) {
                        _data.delete('checks', checkId, function(err) {
                            if (!err) {
                                _data.read('users', checkData.phone, function(err, userData) {
                                    if (!err && userData) {
                                        var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                                        var checkPosition = userChecks.indexOf(checkId);
                                        if (checkPosition > -1) {
                                            userChecks.splice(checkPosition, 1);
                                            _data.update('users', checkData.phone, userData, function(err) {
                                                if (!err) {
                                                    delete userData.password;
                                                    callback(200, userData);
                                                } else callback(500, { 'Error': 'Could not update the user' });
                                            });
                                        } else callback(500, { 'Error': 'Could not find the check on the user' });
                                    } else callback(500, { 'Error': 'Could not find the user who creaded the check' });
                                });
                            } else callback(500, { 'Error': 'Could not delete the check data' });
                        });
                    } else callback(403, { 'Error': 'Session timeout' });
                });
            } else callback(400, { 'Error': 'Could not read the check' });
        });
    } else callback(400, { 'Error': 'Missing required field' });
};


module.exports = handlers;
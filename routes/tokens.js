/*
 * Tokens router (/tokens)
 */

const _data = require('../lib/data');
const helpers = require('../lib/helpers');

var handlers = {};

handlers.tokens = function(data, callback) {
    var methods = ['get', 'post', 'put', 'delete'];
    if (methods.indexOf(data.method) > -1)
        handlers._tokens[data.method](data, callback);
    else
        callback(405);
};

handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function(data, callback) {

    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (phone && password) {
        _data.read('users', phone, function(err, userData) {
            if (!err && userData) {
                var hashedPassword = helpers.hash(password);
                if (hashedPassword == userData.password) {
                    var tokenId = helpers.randomString(20);
                    var expires = Date.now() + (1000 * 60 * 30);
                    var tokenObject = {
                        'id': tokenId,
                        phone,
                        expires
                    };
                    _data.create('tokens', tokenId, tokenObject, function(err) {
                        if (!err) callback(200, tokenObject);
                        else callback(500, { 'Error': 'Could not create the new token' })
                    });
                } else callback(400, { 'Error': 'Wrong credentials' });
            } else callback(400, { 'Error': 'Could not find the user' });
        });
    } else callback(400, { 'Error': 'Missing required field' });
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function(data, callback) {

    var tokenId = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    if (tokenId) {
        _data.read('tokens', tokenId, function(err, tokenData) {
            if (!err && tokenData) {
                if (tokenData.expires > Date.now()) {
                    callback(200, tokenData);
                } else callback(400, { 'Message': 'Expired' });
            } else callback(400, { 'Error': 'No token found' });
        });
    } else callback(400, { 'Error': 'Invalid token Id' });
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function(data, callback) {

    var tokenId = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;

    if (tokenId && extend) {
        _data.read('tokens', tokenId, function(err, tokenData) {
            if (!err && tokenData) {
                if (tokenData.expires > Date.now()) {
                    tokenData.expires = Date.now() + (1000 * 60 * 30);
                    _data.update('tokens', tokenId, tokenData, function(err) {
                        if (!err) callback(200, tokenData);
                        else callback(500, { 'Error': 'Could not update tokens expiration' });
                    });
                } else callback(400, { 'Error': 'Token already expired' });
            } else callback(400, { 'Error': 'No token found' });
        });
    } else callback(400, { 'Error': 'Missing required field' });
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function(data, callback) {

    var tokenId = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    if (tokenId) {
        _data.read('tokens', tokenId, function(err, tokenData) {
            if (!err && tokenData) {
                _data.delete('tokens', tokenId, function(err) {
                    if (!err) callback(200, { 'Message': 'Token deleted successfully' });
                    else callback(500, { 'Error': 'Could not delete token' });
                });
            } else callback(400, { 'Error': 'Could not find the token' });
        });
    } else callback(400, { 'Error': 'Missing required field' });
};

// Utility function to verify token
handlers._tokens.verifyToken = function(id, phone, callback) {
    _data.read('tokens', id, function(err, tokenData) {
        if (!err && tokenData) {
            if (tokenData.phone == phone && tokenData.expires > Date.now()) {
                callback(true);
            } else callback(false);
        } else callback(false);
    });
};


module.exports = handlers;
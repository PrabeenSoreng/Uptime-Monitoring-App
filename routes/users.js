/*
 * Users router (/users)
 */

const _data = require('../lib/data');
const helpers = require('../lib/helpers');
const tokensHandler = require('./tokens');

var handlers = {};

handlers.users = function(data, callback) {
    var methods = ['post', 'get', 'put', 'delete'];
    if (methods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};

handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function(data, callback) {

    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        _data.read('users', phone, function(err, userData) {
            if (err) {
                var hashedPassword = helpers.hash(password);
                if (hashedPassword) {
                    var userObject = {
                        firstName,
                        lastName,
                        phone,
                        'password': hashedPassword,
                        tosAgreement
                    };
                    _data.create('users', phone, userObject, function(err) {
                        if (!err) callback(200, userObject);
                        else callback(500, { 'Error': 'Could not create the new user' });
                    });
                } else callback(500, { 'Error': "Could not hash the user's password" });
            } else callback(400, { 'Error': 'User with that phone number already exists.' });
        });
    } else callback(400, { 'Error': 'Missing required fields.' });
};

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = function(data, callback) {

    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;

    if (phone) {
        var tokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        tokensHandler._tokens.verifyToken(tokenId, phone, function(isValid) {
            if (isValid) {
                _data.read('users', phone, function(err, userData) {
                    if (!err && userData) {
                        delete userData.password;
                        callback(200, userData);
                    } else callback(400, { 'Error': 'User does not exist' });
                });
            } else callback(403, { 'Error': 'Token missing or invalid' });
        });
    } else callback(400, { 'Error': 'Missing required field' });
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password
handlers._users.put = function(data, callback) {

    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;

    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var updatePhone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

    if (phone) {
        if (firstName || lastName || password || updatePhone) {
            var tokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            tokensHandler._tokens.verifyToken(tokenId, phone, function(isValid, tokenData) {
                if (isValid) {
                    _data.read('users', phone, function(err, userData) {
                        if (!err && userData) {
                            if (firstName) userData.firstName = firstName;
                            if (lastName) userData.lastName = lastName;
                            if (password)
                                userData.password = helpers.hash(password);
                            if (updatePhone) {
                                userData.phone = updatePhone;
                                _data.read('users', updatePhone, function(err) {
                                    if (err) {
                                        _data.create('users', updatePhone, userData, function(err) {
                                            if (!err) {
                                                _data.delete('users', phone, function(err) {
                                                    if (!err) {
                                                        tokenData.phone = updatePhone;
                                                        _data.update('tokens', tokenId, tokenData, function(err) {
                                                            if (!err) {
                                                                if (typeof(userData.checks) == 'undefined' || userData.checks.length == 0) {
                                                                    callback(200, { 'Message': 'All clear' });
                                                                } else {
                                                                    var checksToUpdate = userData.checks.length;
                                                                    var deletionError = false;
                                                                    userData.checks.forEach(checkId => {
                                                                        _data.read('checks', checkId, function(err, checkData) {
                                                                            if (!err && checkData) {
                                                                                checkData.phone = updatePhone;
                                                                                _data.update('checks', checkId, checkData, function(err) {
                                                                                    checksToUpdate--;
                                                                                    if (err) deletionError = true;
                                                                                    if (checksToUpdate == 0) {
                                                                                        if (!deletionError) callback(200, { 'Message': 'User token and all checks were Updated' });
                                                                                        else callback(500, { 'Message': 'Error while updating checks, not all checks are updated' });
                                                                                    }
                                                                                });
                                                                            } else callback(500, { 'Error': 'Cannot read checks' });
                                                                        });
                                                                    });
                                                                }
                                                            } else callback(500, { 'Error': 'Could not update token payload' });
                                                        });
                                                    } else callback(500, { 'Error': 'Could not delete' });
                                                });
                                            } else callback(500, { 'Error': 'Could not create the new user' });
                                        });
                                    } else callback(400, { 'Error': 'User with that phone number already exists' });
                                });
                            } else {
                                _data.update('users', phone, userData, function(err) {
                                    if (!err) callback(200, userData);
                                    else callback(500, { 'Error': 'Could not update the error' });
                                });
                            }
                        } else callback(400, { 'Error': 'The specified user does not exist' });
                    });
                } else callback(403, { 'Error': 'Token missing or invalid' });
            });
        } else callback(400, { 'Error': 'Missing fields to update' });
    } else callback(400, { 'Error': 'Missing required field' });
};

// Users - delete
// Required data: phone
handlers._users.delete = function(data, callback) {

    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;

    if (phone) {
        var tokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        tokensHandler._tokens.verifyToken(tokenId, phone, function(isValid) {
            if (isValid) {
                _data.read('users', phone, function(err, userData) {
                    if (!err && userData) {
                        _data.delete('users', phone, function(err) {
                            if (!err) {
                                if (typeof(userData.checks) == 'undefined' || userData.checks.length == 0) {
                                    callback(200, { 'Message': 'All clear' });
                                } else {
                                    var checksToDelete = userData.checks.length;
                                    var deletionError = false;
                                    userData.checks.forEach(checkId => {
                                        _data.delete('checks', checkId, function(err) {
                                            checksToDelete--;
                                            if (err) deletionError = true;
                                            if (checksToDelete == 0) {
                                                if (!deletionError) callback(200, { 'Message': 'All clear' });
                                                else callback(500, { 'Message': 'Error while deleting checks, not all checks are deleted' });
                                            }
                                        });
                                    });
                                }
                            } else callback(500, { 'Error': 'Could not delete the specified user' });
                        });
                    } else callback(400, { 'Error': 'Could not find the specified user' });
                });
            } else callback(403, { 'Error': 'Token missing or invalid' });
        });
    } else callback(400, { 'Error': 'Missing required field' });
};

module.exports = handlers
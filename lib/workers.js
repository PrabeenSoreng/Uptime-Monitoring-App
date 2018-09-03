/*
 * Worker-related tasks
 */

const path = require('path');
const fs = require('fs');
const url = require('url');
const http = require('http');
const https = require('https');
const _data = require('./data');
const _logs = require('./logs');
const helpers = require('./helpers');

var workers = {};

workers.gatherAllChecks = function() {
    _data.list('checks', function(err, checks) {
        if (!err && checks && checks.length > 0) {
            checks.forEach(check => {
                _data.read('checks', check, function(err, checkData) {
                    if (!err && checkData) {
                        workers.validateCheckData(checkData);
                    } else console.log("Error reading on of the checks data");
                });
            });
        } else console.log("Error: Could not find any checks to process");
    });
};

workers.validateCheckData = function(checkData) {
    checkData.state = typeof(checkData.state) == 'string' && ['up', 'down'].indexOf(checkData.state) > -1 ? checkData.state : 'down';
    checkData.lastChecked = typeof(checkData.lastChecked) == 'number' && checkData.lastChecked > 0 ? checkData.lastChecked : false;

    if (checkData.id &&
        checkData.phone &&
        checkData.protocol &&
        checkData.url &&
        checkData.method &&
        checkData.successCodes &&
        checkData.timeoutSeconds) {
        workers.performCheck(checkData);
    } else console.log("Error : One of the checks is not properly formatted");
};

workers.performCheck = function(checkData) {
    var checkOutcome = {
        'error': false,
        'responseCode': false
    };
    var outcomeSent = false;

    var parsedUrl = url.parse(checkData.protocol + '://' + checkData.url, true);
    var hostName = parsedUrl.hostname;
    var path = parsedUrl.path;
    var requestDetails = {
        'protocol': checkData.protocol + ':',
        'hostname': hostName,
        'method': checkData.method.toUpperCase(),
        'path': path,
        'timeout': checkData.timeoutSeconds * 1000
    };

    var _moduleToUse = checkData.protocol == 'http' ? http : https;
    var req = _moduleToUse.request(requestDetails, function(res) {
        var status = res.statusCode;
        checkOutcome.responseCode = status;
        if (!outcomeSent) {
            workers.processCheckOutcome(checkData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.on('error', function(e) {
        checkOutcome.error = {
            'error': true,
            'value': e
        };
        if (!outcomeSent) {
            workers.processCheckOutcome(checkData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.on('timeout', function(e) {
        checkOutcome.error = {
            'error': true,
            'value': 'Timeout'
        };
        if (!outcomeSent) {
            workers.processCheckOutcome(checkData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.end();
};

workers.processCheckOutcome = function(checkData, checkOutcome) {
    var state = !checkOutcome.error && checkOutcome.responseCode && checkData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';
    var alertWarranted = checkData.lastChecked && checkData.state !== state ? true : false;

    //Log the outcome
    var timeOfCheck = Date.now();
    workers.log(checkData, checkOutcome, state, alertWarranted, timeOfCheck);

    var newCheckData = checkData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;

    _data.update('checks', newCheckData.id, newCheckData, function(err) {
        if (!err) {
            if (alertWarranted) {
                workers.alertUserToStatusChange(newCheckData);
            } else console.log('checkoutCome has not changed, no alert needed');
        } else console.log("Error trying to save updates to one of the checks");
    });
};

workers.alertUserToStatusChange = function(newCheckData) {
    var msg = 'Alert : Your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + './/' + newCheckData.url + ' is currently ' + newCheckData.state;
    helpers.sendTwilioSms(newCheckData.phone, msg, function(err) {
        if (!err) {
            console.log("Alert : User was alerted to a status change in their check, via SMS", msg);
        } else console.log('Error : Could not send SMS alert to the user who had a state change in their check');
    });
};

//
workers.log = function(checkData, checkOutcome, state, alertWarranted, timeOfCheck) {
    var logData = {
        'check': checkData,
        'outcome': checkOutcome,
        'state': state,
        'alert': alertWarranted,
        'time': timeOfCheck
    };
    var logString = JSON.stringify(logData);
    var logFileName = checkData.id;
    _logs.append(logFileName, logString, function(err) {
        if (!err) console.log("Logging to file succeeded");
        else console.log("Logging to file failed");
    });
};

workers.loop = function() {
    setInterval(() => {
        workers.gatherAllChecks();
    }, 1000 * 60);
};

// Rotate (Compress) the log files
workers.rotateLogs = function() {
    _logs.list(false, function(err, logs) {
        if (!err && logs && logs.length > 0) {
            logs.forEach(logName => {
                var logId = logName.replace('.log', '');
                var newFileId = logId + '-' + Date.now();
                _logs.compress(logId, newFileId, function(err) {
                    if (!err) {
                        _logs.truncate(logId, function(err) {
                            if (!err) console.log("Success truncating log file");
                            else console.log("Error truncating log file");
                        });
                    } else console.log("Error compressing one of the log files", err);
                });
            });
        } else console.log("Error : Could not find any logs to rotate");
    });
};

workers.logRotationLoop = function() {
    setInterval(() => {
        workers.rotateLogs();
    }, 1000 * 60 * 60 * 24);
};

workers.init = function() {
    workers.gatherAllChecks();
    workers.loop();
    workers.rotateLogs();
    workers.logRotationLoop();
};

module.exports = workers;
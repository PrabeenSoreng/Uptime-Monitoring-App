/*
 * Library for storing and rotating logs
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

var lib = {};

lib.baseDir = path.join(__dirname, '../.logs/');

// Append a string to a file. Create the file if it does not exist.
lib.append = function(file, str, callback) {
    fs.open(lib.baseDir + file + '.log', 'a', function(err, fileDescriptor) {
        if (!err && fileDescriptor) {
            fs.appendFile(fileDescriptor, str + '\n', function(err) {
                if (!err) {
                    fs.close(fileDescriptor, function(err) {
                        if (!err) callback(false);
                        else callback("Error closing the file that was being appended");
                    });
                } else callback("Error appending to file");
            });
        } else callback("Could not open file for appending");
    });
};

// List all the logs and optionally inculde the compressed logs
lib.list = function(includeCompressedLogs, callback) {
    fs.readdir(lib.baseDir, function(err, data) {
        if (!err && data && data.length > 0) {
            var trimmedFileNames = [];
            data.forEach(fileName => {
                if (fileName.indexOf('.log') > -1) {
                    trimmedFileNames.push(fileName.replace('.log', ''));
                }
                if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
                    trimmedFileNames.push(fileName.replace('.gz.b64', ''));
                }
            });
            callback(false, trimmedFileNames);
        } else callback(err, data);
    });
};

lib.compress = function(logId, newFileId, callback) {
    var sourceFile = logId + '.log';
    var destinationFile = newFileId + '.gz.b64';

    fs.readFile(lib.baseDir + sourceFile, 'utf8', function(err, inputString) {
        if (!err && inputString) {
            zlib.gzip(inputString, function(err, buffer) {
                if (!err && buffer) {
                    fs.open(lib.baseDir + destinationFile, 'wx', function(err, fileDescriptor) {
                        if (!err && fileDescriptor) {
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), function(err) {
                                if (!err) {
                                    fs.close(fileDescriptor, function(err) {
                                        if (!err) callback(false);
                                        else callback(err);
                                    });
                                } else callback(err);
                            });
                        } else callback(err);
                    });
                } else callback(err);
            });
        } else callback(err);
    });
};

// Decompress the contents of a .gz.b64 file into a string variable
lib.decompress = function(fileId, callback) {
    var fileName = fileId + '.gz.b64';
    fs.readFile(lib.baseDir + fileName, 'utf8', function(err, str) {
        if (!err && str) {
            var inputBuffer = Buffer.from(str, 'base64');
            zlib.unzip(inputBuffer, function(err, outputBuffer) {
                if (!err && outputBuffer) {
                    var str = outputBuffer.toString();
                    callback(false, str);
                } else callback(err);
            });
        } else callback(err);
    });
};

// Truncate a log file
lib.truncate = function(logId, callback) {
    fs.truncate(lib.baseDir + logId + '.log', 0, function(err) {
        if (!err) callback(false);
        else callback(err);
    });
};


module.exports = lib;
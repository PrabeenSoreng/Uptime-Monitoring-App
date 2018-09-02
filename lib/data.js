/*
 * Library used for storing and editing data
 */

const path = require('path');
const fs = require('fs');
const helpers = require('./helpers');

var lib = {};

lib.baseDir = path.join(__dirname, '../.data/');

lib.create = function(dir, file, data, callback) {
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', function(err, fileDescriptor) {
        if (!err && fileDescriptor) {
            var stringData = JSON.stringify(data);
            fs.writeFile(fileDescriptor, stringData, function(err) {
                if (!err) {
                    fs.close(fileDescriptor, function(err) {
                        if (!err) callback(false);
                        else callback("Error closing the file.");
                    });
                } else callback("Error writing to new file.");
            });
        } else callback('Could not create new file, it may already exists.');
    });
};

lib.read = function(dir, file, callback) {
    fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf8', function(err, data) {
        if (!err && data) {
            var parsedData = helpers.parseJsonToObject(data);
            callback(false, parsedData);
        } else callback(err, data);
    });
};

lib.update = function(dir, file, data, callback) {
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', function(err, fileDescriptor) {
        if (!err && fileDescriptor) {
            var stringData = JSON.stringify(data);
            fs.truncate(fileDescriptor, function(err) {
                if (!err && fileDescriptor) {
                    fs.writeFile(fileDescriptor, stringData, function(err) {
                        if (!err && fileDescriptor) {
                            fs.close(fileDescriptor, function(err) {
                                if (!err) callback(false);
                                else callback("Error closing the file.");
                            });
                        } else callback("Error writing to the existing file.");
                    });
                } else callback("Error truncating the file.");
            })
        } else callback("Could not open the file for updating, it may not exist yet");
    });
};

lib.delete = function(dir, file, callback) {
    fs.unlink(lib.baseDir + dir + '/' + file + '.json', function(err) {
        if (!err) callback(false);
        else callback("Error deleting the file.");
    });
};

lib.list = function(dir, callback) {
    fs.readdir(lib.baseDir + dir + '/', 'utf8', function(err, data) {
        if (!err && data && data.length > 0) {
            var trimmedFileNames = [];
            data.forEach(fileName => {
                trimmedFileNames.push(fileName.replace('.json', ''));
            });
            callback(false, trimmedFileNames);
        } else callback(err, data);
    });
};


module.exports = lib;
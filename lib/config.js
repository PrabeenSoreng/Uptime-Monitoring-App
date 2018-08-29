/*
 * Configuration file
 */

var environments = {};

environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'staging',
    'hashingSecret': 'thisIsASecret'
};

environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'production',
    'hashingSecret': 'thisIsAlsoASecret'
};

var currnetEnvironmnet = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

var environment = typeof(environments[currnetEnvironmnet]) == 'object' ? environments[currnetEnvironmnet] : environments.staging;

module.exports = environment;
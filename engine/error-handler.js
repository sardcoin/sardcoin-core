let createError = require('http-errors');

exports.validationError = function  (err, req, res, next){

    if (err !== null) {
        return res.status(500).json(err);
    }
};

exports.fun404 = function (req, res, next) {

    return res.status(404).json({
        statusCode: 404,
        error:      "Resource not found.",
        message:    "The resource URL of the request cannot be found in this server."
    });
};
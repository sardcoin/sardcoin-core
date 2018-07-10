let createError = require('http-errors');

exports.validationError = function  (err, req, res, next){

    if (err !== null) {
        return res.status(err.output.statusCode).json(err.output.payload);
    }
};

exports.fun404 = function (req, res, next) {

    return res.status(404).json({ error_message: "Page not found." });
};
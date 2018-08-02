'use strict';

/**
 * Module dependencies.
 */

const express =      require('express');
const cookieParser = require('cookie-parser');
const cors =         require('cors');
let path   =         require('path');
let helmet =         require('helmet');
let logger =         require('morgan');
let config =         require('./index');
const bodyParser =   require('body-parser');

module.exports = function (app, passport) {

    // use bodyParser
    app.use(bodyParser.json());

    // use passport
    app.use(passport.initialize());
    app.use(passport.session());

    // use helmet
    app.use(helmet());

    // view engine setup
    app.set('views', config.root + '/views');
    app.set('view engine', 'jade');

    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({extended: false}));
    app.use(cookieParser());
    app.use(express.static(config.root + '/public'));

    // enabling cors
    app.use(cors());

};
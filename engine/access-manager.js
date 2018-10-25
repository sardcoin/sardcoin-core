'use strict';

const Users = require('../models/index').User;
const Op    = require('../models/index').Sequelize.Op;
const passport = require('../app').passport;
const bcrypt = require('bcrypt-nodejs');
const jwt = require('jsonwebtoken');
const HttpStatus = require('http-status-codes');

exports.createUser = function (req, res, next) {
    const user = req.body;
    const password = bcrypt.hashSync(user.password);

    Users.findAll({
        where: {
            [Op.or] : [
                { username: user.username },
                { email: user.email }
            ]
        }
    })
        .then(userbn => {
            // user !== null then a username or an email already exists in the sistem
            // the registration has to be rejected

            if(userbn.length !== 0) {
                return res.status(HttpStatus.BAD_REQUEST).send({
                    created: false,
                    error: 'Username or email already exists'
                });
            } else {
                // A new user can be created

                Users.create({
                    username: user.username,
                    email: user.email,
                    company_name: user.company_name,
                    vat_number: user.vat_number,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    birth_place: user.birth_place,
                    birth_date: new Date(user.birth_date),
                    fiscal_code: user.fiscal_code,
                    address: user.address,
                    province: user.province,
                    city: user.city,
                    zip: user.zip,
                    password: password,
                    user_type: user.user_type,
                    checksum: '0',
                    email_paypal: user.email_paypal
                })
                    .then(newUser => {
                        return res.status(HttpStatus.CREATED).send({
                            created:    true,
                            first_name: newUser.get('first_name'),
                            last_name:  newUser.get('last_name')
                        });
                    })
                    .catch(err => {
                        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                            created:  false,
                            username: user.username
                        });
                    })
            }
        })
    ;
};

exports.getUserById = function (req, res, next) {
    Users.findById(req.user.id)
        .then(user => {
            return res.status(HttpStatus.OK).send(user);
        })
        .catch(err => {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: err
            });
        })
};

exports.getProducerFromId = function (req, res, next) {
    Users.findOne({
        where: {
            id: req.params.producer_id,
        }
    })
        .then(user => {
            if (user === null) {
                return res.status(HttpStatus.OK).json({
                    error: 'No user found with the given id and the given coupon',
                    producer_id: req.params.producer_id,
                    user_id: req.user.id
                })
            }
            // console.log('userForimId', user);
            return res.status(HttpStatus.OK).json(user)
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: err
            })
        });
};

exports.updateUser = function (req, res, next) {

    const user = req.body;
    const password = bcrypt.hashSync(user.password);

    Users.update({
        username: user.username,
        email: user.email,
        company_name: user.company_name,
        vat_number: user.vat_number,
        first_name: user.first_name,
        last_name: user.last_name,
        birth_place: user.birth_place,
        birth_date: new Date(user.birth_date),
        fiscal_code: user.fiscal_code,
        address: user.address,
        province: user.province,
        city: user.city,
        zip: user.zip,
        password: password,
        email_paypal: user.email_paypal

    }, {
        where: {
            id: req.user.id
        }
    })
        .then(newUser => {
            return res.status(HttpStatus.OK).json({
                updated: true,
                user_id: req.user.id
            })
        })
        .catch(err => {
            console.log(err);

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                updated: false,
                user_id: req.user.id,
                error: 'Cannot update the user'
            })
        });
};

exports.deleteUser = function (req, res, next) {
    Users.destroy({where: {user: req.body.username}})
        .then(() => {
            return res.status(HttpStatus.OK).json({
                deleted: true,
                service: parseInt(req.body.username)
            })
        })
        .catch(err => {
            console.log(err);

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                deleted: false,
                user: req.body.username,
                error: 'Cannot delete the user'
            })
        })
};

exports.basicLogin = function (req, res, next) {
    passport.authenticate('basic', {session: false}, function (err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({
                logged: false,
                error: 'unauthorized'
            })
        } else {
            const token = jwt.sign(user.dataValues, 'your_jwt_secret');
            return res.status(HttpStatus.OK).json({user, token});
        }
    })(req, res, next);
};

exports.roleAuthorization = function(roles){

    return function(req, res, next){

        let user = req.user;

        Users.findById(user.id)
            .then(userFound => {
                console.log(roles);

                if(roles.indexOf(userFound.user_type) > -1){
                    return next();
                }

                res.status(401).json({error: 'You are not authorized to view this content'});
                return next('Unauthorized');
            })
            .catch(err => {
                res.status(422).json({error: 'No user found.'});
                return next(err);
            });
    }
};
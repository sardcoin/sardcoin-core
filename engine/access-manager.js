'use strict';

const Op = require('../models/index').Sequelize.Op;
const passport = require('../app').passport;
const bcrypt = require('bcrypt-nodejs');
const jwt = require('jsonwebtoken');
const HttpStatus = require('http-status-codes');
const Users = require('../models/index').User;

exports.createUser = function (req, res, next) {
    const user = req.body;
    const password = bcrypt.hashSync(user.password);

    Users.findAll({
        where: {
            [Op.or]: [
                {username: user.username},
                {email: user.email}
            ]
        }
    })
        .then(userbn => {
            // user !== null then a username or an email already exists in the sistem
            // the registration has to be rejected

            if (userbn.length !== 0) {
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
                            created: true,
                            first_name: newUser.get('first_name'),
                            last_name: newUser.get('last_name')
                        });
                    })
                    .catch(err => {
                        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                            created: false,
                            username: user.username
                        });
                    })
            }
        })
    ;
};

exports.getUserFromToken = function (req, res, next) {
    Users.findOne({where: {id: req.user.id}})
        .then(user => {
            return res.status(HttpStatus.OK).send(user);
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot retrieve the personal informations of the user'
            });
        })
};

exports.getProducerFromId = function (req, res, next) {
    Users.findOne({
        where: {
            id: req.params.producer_id,
            user_type: 1
        },
        attributes: ['username', 'email', 'company_name',
            'vat_number', 'first_name', 'last_name', 'address', 'province',
            'city', 'zip']
    })
        .then(user => {
            if (user === null) {
                return res.status(HttpStatus.OK).json({
                    error: 'Either the user does not exist or it is not a producer',
                    producer_id: req.params.producer_id,
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

    // console.log(user);

    Users.update({
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
            //console.log(newUser);
            if (newUser[0] === 0) {
                return res.status(HttpStatus.NO_CONTENT).json({
                    updated: false,
                    user_id: req.user.id,
                    message: 'An error occurred while updating the requested user'
                })
            }

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
                error: 'Cannot editCoupon the user'
            })
        });
};

exports.deleteUser = function (req, res, next) {
    Users.destroy({
        where: {
            [Op.and]: [
                {username: req.body.username}
            ]
        }
    })
        .then((user) => {
            if (user == 0) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    deleted: false,
                    username: req.body.username,
                    message: "The request user does not exist."
                })
            }
            else {
                return res.status(HttpStatus.OK).json({
                    deleted: true,
                    username: req.body.username

                })
            }
        })
        .catch(err => {
            console.log(err);

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                deleted: false,
                user: req.body.username,
                error: 'Cannot deleteCoupon the user'
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
            return res.status(HttpStatus.OK).json({
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    "user_type": user.user_type,
                }, token
            });
        }
    })(req, res, next);
};

exports.roleAuth = (roles) => {
    return async (req, res, next) => {
        const user = req.user;

        if (roles.indexOf(user.user_type) > -1) {
            return next();
        } else {
            return res.status(401).json({error: true, message: 'You are not authorized to view this content'});
        }
    }
};


// TODO rimuovere, dovrebbe essere inutile con nuovo paypal
// exports.getAccessToken = function (req, res, next) {
//     Users.findById(req.user.id)
//         .then(user => {
//             return res.status(HttpStatus.OK).send(user);
//         })
//         .catch(err => {
//             console.log(err);
//             return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
//                 error: true,
//                 message: 'Cannot retrieve the personal informations of the user'
//             });
//         })
// };
// funzione per prelevare l'<access-token>
// exports.getAccessToken = async function (producer_id, callback) {
//
//     var accessToken = null;
//
//     const _getClientId = await getClientId(producer_id);
//     const  clientId = _getClientId.dataValues.client_id;
//     const _getPasswordSecret = await getPasswordSecret(producer_id);
//     const  passwordSecret = _getPasswordSecret.dataValues.password_secret;
//
//     console.log('clientId', clientId);
//     console.log('passwordSecret', passwordSecret);
//
//
//
//     var headers = {
//         'Accept': 'application/json',
//         'Accept-Language': 'en_US'
//     };
//
//     var dataString = 'grant_type=client_credentials';
//     var options = {
//         url: 'https://api.sandbox.paypal.com/v1/oauth2/token',
//         method: 'POST',
//         headers: headers,
//         body: dataString,
//         auth: {
//             'user': clientId,
//             'pass': passwordSecret
//         }
//     };
//
//     request(options, call);
//
//    function  call(error, response, body) {
//
//             if (!error && response.statusCode == 200) {
//                 if (body != undefined) {
//                     const _body =JSON.parse(body);
//                     accessToken = _body.access_token;
//                     return callback(accessToken);
//
//                 }
//             }
//     }
//
//     return this;
// };
// done, funzione per prelevare id dell'app paypal situata nel db
// async function getClientId(producer_id) {
//
//     return new Promise( ((resolve, reject) => {
//         Users.findOne({
//             attributes: ["client_id"],
//             where: {id: producer_id}
//
//         }).then(client_id => {
//             resolve(client_id);
//         }).catch(err => {
//             console.log(err);
//
//         })
//     }))
//
//
// }
//
// // done funzione per prelevare la secret dell'app paypal situata nel db
// async function getPasswordSecret(producer_id) {
//
//     return new Promise( ((resolve, reject) => {
//         Users.findOne({
//             attributes: ["password_secret"],
//             where: {id: producer_id}
//
//         }).then(password_secret => {
//             resolve(password_secret);
//             return password_secret;
//         }).catch(err => {
//             console.log(err);
//         })
//     }))
// }


exports.getBrokers = function (req, res, next) {
    Users.findAll({
        where: {
            user_type: 4
        },
        attributes: ['id', 'username', 'email', 'company_name',
            'vat_number', 'first_name', 'last_name', 'address', 'province',
            'city', 'zip']
    })
        .then(broker => {
            if (broker === null) {
                return res.status(HttpStatus.NO_CONTENT).send({})
            }
            return res.status(HttpStatus.OK).send(broker)
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: err
            })
        });
};



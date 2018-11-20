'use strict';

const Users = require('../models/index').User;
const Op    = require('../models/index').Sequelize.Op;
const passport = require('../app').passport;
const bcrypt = require('bcrypt-nodejs');
const jwt = require('jsonwebtoken');
const HttpStatus = require('http-status-codes');
/**
 * @api {post} /users/create Create user
 * @apiName CreateUser
 * @apiGroup User
 *
 * @apiParam {String} username username of user .
 * @apiParam {String} email email of the user .
 * @apiParam {String} company_name Company name of the user .
 * @apiParam {String} vat_number Vat number of the user  .
 * @apiParam {String} first_name First name of the user.
 * @apiParam {String} last_name Last name of the user.
 * @apiParam {String} birth_place Birth place of the user.
 * @apiParam {String} birth_date Birth date of the user.
 * @apiParam {String} zip Zip code of the user.
 * @apiParam {String} email_paypal email paypal of the user.
 * @apiParam {String} password password of the user.



 * @apiSuccess {String} first_name first name of the User request.
 * @apiSuccess {String} last_name last name of the User request.

 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *          "first_name":"Alessio",
 *          "last_name":"Delrio"
 *     }
 *
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 400 Bad Request
 *          {
 *              "created":false,
 *              "error":"Username or email already exists"
 *           }
 *
 */
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
/**
 * @api {get} /users/getFromToken Get User from token bearer
 * @apiName getFromToken
 * @apiGroup User
 * @apiPermission admin
 * @apiPermission producer
 * @apiPermission consumer
 *
 *
 * @apiHeader {String} Authorization Json Web Token retrieved from login request.
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Authorization": "Bearer YW55X25hbWUiOm51bGwsInZhdF9udW1iZXIi"
 *     }
 *
 *
 * @apiSuccess {Number} id Identifier of the User request.
 * @apiSuccess {String} username username of the User request.
 * @apiSuccess {String} email email of the User request.
 * @apiSuccess {String} company_name company name of the User request.
 * @apiSuccess {String} vat_number vat number of the User request.
 * @apiSuccess {String} first_name first name of the User request.
 * @apiSuccess {String} last_name last name of the User request.
 * @apiSuccess {String} birth_place birth place of the User request.
 * @apiSuccess {String} birth_date birth date of the User request.
 * @apiSuccess {String} fiscal_code fiscal code of the User request.
 * @apiSuccess {String} address address of the User request.
 * @apiSuccess {String} province province of the User request.
 * @apiSuccess {String} city city of the User request.
 * @apiSuccess {String} zip zip code of the User request.
 * @apiSuccess {String} password password (crypto) of the User request.
 * @apiSuccess {String} user_type user type of the User request.
 * @apiSuccess {String} checksum checksum of the User request.
 * @apiSuccess {String} email_paypal email paypal of the User request.


 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *          "id":2,
 *          "username":"admin",
 *          "email":"email@email.com",
 *          "company_name":"company_name",
 *          "vat_number":"100",
 *          "first_name":"Alessio",
 *          "last_name":"Delrio",
 *          "birth_place":"Gesturi",
 *          "birth_date":"2000-01-01",
 *          "fiscal_code":"psveindoven79c4412dsfdf",
 *          "address":"address",
 *          "province":"CA",
 *          "city":"city",
 *          "zip":"09100",
 *          "password":"$2a$10$uVPr7u7bhuiWLWg8pbUx6.rLbPz6wTMjlC1au3V.6P2beduRrr3ma",
 *          "user_type":"0",
 *          "checksum":"0",
 *          "email_paypal":"email_paypal@libero.it"
 *     }
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 *
 *
 */
exports.getUserFromToken = function (req, res, next) {
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
/**
 * @api {get} /users/getProducerFromId/:producer_id Get producer
 * @apiName getProducerFromId
 * @apiGroup User
 * @apiPermission admin
 * @apiPermission producer
 * @apiPermission consumer
 *
 *
 * @apiParam {Number} id id of user request.

 * @apiHeader {String} Authorization Json Web Token retrieved from login request.
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Authorization": "Bearer YW55X25hbWUiOm51bGwsInZhdF9udW1iZXIi"
 *     }
 *
 *
 * @apiSuccess {Number} id Identifier of the User request.
 * @apiSuccess {String} username username of the User request.
 * @apiSuccess {String} email email of the User request.
 * @apiSuccess {String} company_name company name of the User request.
 * @apiSuccess {String} vat_number vat number of the User request.
 * @apiSuccess {String} first_name first name of the User request.
 * @apiSuccess {String} last_name last name of the User request.
 * @apiSuccess {String} birth_place birth place of the User request.
 * @apiSuccess {String} birth_date birth date of the User request.
 * @apiSuccess {String} fiscal_code fiscal code of the User request.
 * @apiSuccess {String} address address of the User request.
 * @apiSuccess {String} province province of the User request.
 * @apiSuccess {String} city city of the User request.
 * @apiSuccess {String} zip zip code of the User request.
 * @apiSuccess {String} password password (crypto) of the User request.
 * @apiSuccess {String} user_type user type of the User request.
 * @apiSuccess {String} checksum checksum of the User request.
 * @apiSuccess {String} email_paypal email paypal of the User request.


 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *          "id":2,
 *          "username":"admin",
 *          "email":"email@email.com",
 *          "company_name":"company_name",
 *          "vat_number":"100",
 *          "first_name":"Alessio",
 *          "last_name":"Delrio",
 *          "birth_place":"Gesturi",
 *          "birth_date":"2000-01-01",
 *          "fiscal_code":"psveindoven79c4412dsfdf",
 *          "address":"address",
 *          "province":"CA",
 *          "city":"city",
 *          "zip":"09100",
 *          "password":"$2a$10$uVPr7u7bhuiWLWg8pbUx6.rLbPz6wTMjlC1au3V.6P2beduRrr3ma",
 *          "user_type":"0",
 *          "checksum":"0",
 *          "email_paypal":"email_paypal@libero.it"
 *     }
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 *
 *
 * @apiErrorExample Error-Response:
 *      HTTP/1.1 200 OK
 *
 *          {
 *              "error":"No user found with the given id and the given coupon","producer_id":"100"
 *          }
 *
 */
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
/**
 * @api {put} /users/editCoupon Update user
 * @apiName UpdateUser
 * @apiGroup User
 * @apiPermission admin
 * @apiPermission producer
 * @apiPermission consumer
 *
 *
 * @apiParam {String} username username of user.
 * @apiParam {String} email email of the user.
 * @apiParam {String} company_name Company name of the user.
 * @apiParam {String} vat_number Vat number of the user.
 * @apiParam {String} first_name First name of the user.
 * @apiParam {String} last_name Last name of the user.
 * @apiParam {String} birth_place Birth place of the user.
 * @apiParam {String} birth_date Birth date of the user.
 * @apiParam {String} zip Zip code of the user.
 * @apiParam {String} email_paypal email paypal of the user.
 * @apiParam {String} password password of the user.

 * @apiHeader {String} Authorization Json Web Token retrieved from login request.
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Authorization": "Bearer YW55X25hbWUiOm51bGwsInZhdF9udW1iZXIi"
 *     }
 *
 *
 * @apiSuccess {Number} id Identifier of the User.


 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *          updated: true,
            user_id: 12
 *
 *     }
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 */

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
                error: 'Cannot editCoupon the user'
            })
        });
};
/**
 * @api {deleteCoupon} /users/deleteCoupon deleteCoupon user
 * @apiName Delete
 * @apiGroup User
 *
 * @apiParam {String} username username of user (required).
 *
 * @apiSuccess {String} username Username of the User Deleted.


 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *
 *     {
 *          "deleted":true,
 *          "username":"lele"
 *     }
 *
 *
 * @apiErrorExample Error-Response:
 *      HTTP/1.1 401 Unauthorized
 *         Unauthorized
 *
 *
 * * @apiErrorExample Error-Response:
 *     HTTP/1.1 200 OK
 {
 *          "deleted":false,
 *          "username":"lele",
 *          "message": "User don't exist!!"
 *     }
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *         {
                "error": "You are not authorized to view this content"
            }

 *
 *
 * * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal Server Error
 *         {
                "deleted": false,
                "error": "Cannot deleteCoupon the user"
            }
 *
 *
 * * * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal Server Error
 *         {
                "deleted": false,
                "user": "Girolandia"
                "error": "Cannot deleteCoupon the user"
            }
 *
 */

exports.deleteUser = function (req, res, next) {
    Users.destroy({
        where: {[Op.and]: [
                {username: req.body.username}
            ]}})
        .then((user) => {
            if(user == 0){
            return res.status(HttpStatus.OK).json({
                deleted: false,
                username: req.body.username,
                message: "user don't exist!!"
            })}
            else {
                return res.status(HttpStatus.OK).json({
                    deleted: true,
                    username: req.body.username

            })
        }})
        .catch(err => {
            console.log(err);

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                deleted: false,
                user: req.body.username,
                error: 'Cannot deleteCoupon the user'
            })
        })
};




/**
 * @api {post} /login login user
 * @apiName Login
 * @apiGroup Login
 * @apiSuccess {Number} id Identifier of the User.
 * @apiSuccess {String} username Username of the User.
 * @apiSuccess {String} email Email of the User.
 * @apiSuccess {String} first_name First Name of the User.
 * @apiSuccess {String} last_name Last Name of the User.
 * @apiSuccess {String} user_type Type of the User.
 *
 *  @apiParam {String} username username of user (required).
 *  @apiParam {String} password password of user (required).
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *  "user": {
 *       "id": 3,
 *       "username": "consumer",
 *       "email": "serusi@gmail.com",
 *       "first_name": "Sergio",
 *       "last_name": "Serusi",
 *       "user_type": "1"
 *       },
 *   "token": "vSE1L8ng-dVJaDlmnmi2JlbMvudkaIeDqvJ-zBjk0Uk"
 *   }
 *
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          {
 *  "logged": false,
 *   "error": "unauthorized"
 *   }
 */
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
            return res.status(HttpStatus.OK).json({'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    "user_type": user.user_type,
                }, token});
        }
    })(req, res, next);
};

exports.roleAuthorization = function(roles){

    return function(req, res, next){

        let user = req.user;

        Users.findById(user.id)
            .then(userFound => {
                // console.log(roles);

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
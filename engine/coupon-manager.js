'use strict';

const Coupon     = require('../models/index').Coupon;
const Sequelize  = require('../models/index').sequelize;
const Op         = require('../models/index').Sequelize.Op;
const HttpStatus = require('http-status-codes');
const fs         = require('file-system');
const path       = require('path');
const crypto     = require('crypto');

function generateUniqueToken(title, password) { // Generates a 8-char unique token based on the coupon title and the user (hashed) passwpord

    const min = Math.ceil(1);
    const max = Math.floor(1000000);
    const total =  Math.floor(Math.random() * (max - min)) + min;

    // console.log('total', total);

    let hash = crypto.createHash('sha256').update(title + password + total.toString()).digest('hex').substr(0, 8).toUpperCase();
    // console.log('COUPON HASH: ' + hash);

    return hash;
}
/**
 * @api {post} /coupons/create Create coupon
 * @apiName CreateCoupon
 * @apiGroup Coupon
 * @apiPermission admin
 * @apiPermission producer
 *
 * @apiParam {String} title title of coupon (required) (into body).
 * @apiParam {String} description description of the coupon (into body).
 * @apiParam {String} image image of the coupon (into body json).
 * @apiParam {String} price price of the coupon (into body json).
 * @apiParam {String} valid_from Valid from of the coupon (required) (into body).
 * @apiParam {String} valid_until Valid until of the coupon (into body).
 * @apiParam {String} constraints constraints of the coupon (into body).
 * @apiParam {String} owner owner of the coupon (required) (into body).
 * @apiParam {String} consumer consumer of the coupon (into body).
 * @apiParam {String} constraints constraints of the coupon (into body).

 * @apiHeader {String} Authorization Json Web Token retrieved from login request.
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Authorization": "Bearer YW55X25hbWUiOm51bGwsInZhdF9udW1iZXIi"
 *     }
 *
 *
 * @apiSuccess {Number} id Identifier of the Coupon.
 * @apiSuccess {String} title Title of the Coupon.
 * @apiSuccess {String} description Description of the Coupon.



 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *          "id": 914,
 *          "title": "Restaurant Schick",
 *          "description": "Pizza for everyone",
 *
 *     }
 *
 * @apiErrorExample
 *      HTTP/1.1 500 Internal Server Error
 *      Error: child "body" fails because [child "title" fails because ["title" is required]].....
 *
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 */
exports.createCoupon = function (req, res, next) {
    console.log('dentro');
    const data = req.body;

    let valid_until = data.valid_until === null ? null : Number(data.valid_until);

    console.log(data.valid_until);

    Coupon.create({
        title: data.title,
        description: data.description,
        image: data.image,
        timestamp: Number(Date.now()),
        price: data.price,
        valid_from: Number(data.valid_from),
        valid_until: valid_until,
        state: data.state,
        constraints: data.constraints,
        owner: data.owner,
        consumer: data.consumer,
        quantity: data.quantity,
        token: generateUniqueToken(data.title, req.user.password),
    })
        .then(newCoupon => {
            return res.status(HttpStatus.CREATED).send({
                created: true,
                id: newCoupon.get('id'),
                title: newCoupon.get('title'),
                description: newCoupon.get('description')
            });
        })
        .catch(err => {
            console.log("The coupon cannot be created.");
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('The coupon cannot be created.', err);


        })

};

/**
 * @api {get} /coupons/getById/:id Get By ID
 * @apiName GetById
 * @apiGroup Coupon
 * @apiPermission admin
 * @apiPermission producer
 *
 * @apiParam {Number} id Coupon unique ID.
 * @apiHeader {String} Authorization Json Web Token retrieved from login request.
 *
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Authorization": "Bearer YW55X25hbWUiOm51bGwsInZhdF9udW1iZXIi"
 *     }
 *
 *
 * @apiSuccess {Number} id Identifier of the Coupon.
 * @apiSuccess {String} title Title of the Coupon.
 * @apiSuccess {String} description Description of the Coupon.
 * @apiSuccess {String} image Path of the image associated with the Coupon.
 * @apiSuccess {Timestamp} timestamp Timestamp of the Coupon creation instant.
 * @apiSuccess {Number} price Price of the Coupon.
 * @apiSuccess {Date} valid_from Date where Coupon starts to be valid.
 * @apiSuccess {Date} valid_until Date where the Coupon ends its validity.
 * @apiSuccess {Number} state State of the Coupon.
 * @apiSuccess {String} constraints Various contraints of the Coupon.
 * @apiSuccess {Number} owner ID of the user who created the Coupon.
 * @apiSuccess {Number} consumer ID of the client who bought the Coupon.
 * @apiSuccess {String} token Token needed for identify the Coupon.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *          "id": 914,
 *          "title": "Restaurant Schick",
 *          "description": "Pizza for everyone",
 *          "image": "pizzeria-maccheroni.jpg",
 *          "timestamp": "2018-08-04T07:04:27.000Z",
 *          "price": 19.95,
 *          "valid_from": "2018-09-04T10:22:00.000Z",
 *          "valid_until": null,
 *          "state": 0,
 *          "constraints": "Ocala, CA, USA",
 *          "owner": 150,
 *          "consumer": null,
 *          "token": "sdaklfjòslfjd"
 *     }
 *
 * @apiError CouponNotFound The id of the User was not found.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *          "error": "No coupon found with the given id and the given user.",
 *          "coupon_id": 1,
 *          "user_id": 1
 *     }
 *
 * @apiError Unauthorized The user is not authorized to do the request.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 */
exports.getFromId = function (req, res, next) {

    Coupon.findOne({
        where: {
            id: req.params.coupon_id,
            [Op.or]: [
                {owner: req.user.id},
                {consumer: req.user.id}
            ]
        }
    })
        .then(coupon => {
            if (coupon === null) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    error: 'No coupon found with the given id and the given user.',
                    coupon_id: parseInt(req.params.coupon_id),
                    user_id: req.user.id
                })
            }

            return res.status(HttpStatus.OK).json(coupon)
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot GET the information about the coupon.'
            })
        });
};

/**
 * @api {get} /coupons/getCreatedCoupons Get Created Coupons from Token
 * @apiName GetCreatedCoupons
 * @apiGroup Coupon
 * @apiPermission admin
 * @apiPermission producer
 *
 * @apiHeader {String} Authorization Json Web Token retrieved from login request.
 *
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Authorization": "Bearer YW55X25hbWUiOm51bGwsInZhdF9udW1iZXIi"
 *     }
 *
 *
 * @apiSuccess {Object} ArrayJsonCoupons Array of Json Created Coupons

 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *{
 *    "id": 14,
 *    "title": "Pizzeria Baccu Mandara",
 *    "description": "Pizza all-you-can-eat per 2 persone da Pizzeria Baccu Mandara (sconto fino a 70%). Prenota&Vai!",
 *    "image": "pizzeria.jpg",
 *    "timestamp": "2018-08-04T07:04:27.000Z",
 *    "price": 19.95,
 *    "valid_from": "2018-09-03T20:22:00.000Z",
 *    "valid_until": "1970-01-01T00:00:00.000Z",
 *    "state": 0,
 *    "constraints": "Geremeas (CA), Loc. Baccu Mandara snc",
 *    "owner": 1,
 *    "consumer": 23,
 *    "token": "eeeeeeee"
 *},
 *{
 *    "id": 19,
 *    "title": "Porta galleggiante gonfiabile",
 *    "description": "Divertimento assicurato per tutti gli amanti dello sport in riva al mare o in piscina, con pallone Intex incluso.",
 *    "image": "piscina.jpg",
 *    "timestamp": "2018-09-04T11:24:47.000Z",
 *    "price": 27.95,
 *    "valid_from": "2018-09-02T09:25:00.000Z",
 *     "valid_until": null,
 *    "state": 0,
 *    "constraints": "Nuoro (NU)",
 *    "owner": 1,
 *    "consumer": null,
 *    "token": "gggggggg"
 *},
 *{
 *    "id": 95,
 *    "title": "Ghetto Quarantasette ",
 *    "description": "Menu hamburger con birra artigianale o calice di vino e dolce per 2 al Ghetto Quarantasei (sconto fino a 62%).",
 *    "image": "resort.jpg",
 *    "timestamp": "2018-10-01T09:42:28.000Z",
 *    "price": 21.95,
 *    "valid_from": "2018-09-03T01:00:00.000Z",
 *    "valid_until": null,
 *    "state": 0,
 *    "constraints": "Oristano (OR), Viale Dei Principi 22",
 *    "owner": 1,
 *    "consumer": 23,
 *    "token": "50DFA03A2"
 *},
 *{
 *    "id": 96,
 *    "title": "Ghetto Quarantasette ",
 *    "description": "Menu hamburger con birra artigianale o calice di vino e dolce per 2 al Ghetto Quarantasei (sconto fino a 62%).",
 *    "image": "resort.jpg",
 *    "timestamp": "2018-10-01T09:42:28.000Z",
 *    "price": 21.95,
 *    "valid_from": "2018-09-03T01:00:00.000Z",
 *    "valid_until": null,
 *    "state": 0,
 *    "constraints": "Oristano (OR), Viale Dei Principi 22",
 *    "owner": 1,
 *    "consumer": 23,
 *    "token": "50DFA03A3"
 *}
 *]
 *
 *
 * @apiError Unauthorized The user is not authorized to do the request.
 *
 * @apiErrorExample Error-Response:
 *      HTTP/1.1 401 Unauthorized
 *          {
                "error": "You are not authorized to view this content"
            }
 *
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 */

exports.getCreatedCoupons = function (req, res, next) {
    Coupon.findAll({
        where: { owner: req.user.id }
    })
        .then(coupons => {
            return res.status(HttpStatus.OK).json(coupons)
        })
        .catch(err => {
            // return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            //     error: err
            // })
            return res.send(JSON.stringify(err));
        });
};

/**
 * @api {get} /coupons/getPurchasedCoupons Get Purchased Coupons from Token
 * @apiName GetPurchasedCoupons
 * @apiGroup Coupon
 * @apiPermission admin
 * @apiPermission consumer
 *
 * @apiHeader {String} Authorization Json Web Token retrieved from login request.
 *
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Authorization": "Bearer YW55X25hbWUiOm51bGwsInZhdF9udW1iZXIi"
 *     }
 *
 *
 * @apiSuccess {Object} ArrayJsonCoupons Array of Json Purchased Coupons

 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 {
     "id": 14,
     "title": "Pizzeria Baccu Mandara",
     "description": "Pizza all-you-can-eat per 2 persone da Pizzeria Baccu Mandara (sconto fino a 70%). Prenota&Vai!",
     "image": "pizzeria.jpg",
     "timestamp": "2018-08-04T07:04:27.000Z",
     "price": 19.95,
     "valid_from": "2018-09-03T20:22:00.000Z",
     "valid_until": "1970-01-01T00:00:00.000Z",
     "state": 0,
     "constraints": "Geremeas (CA), Loc. Baccu Mandara snc",
     "owner": 1,
     "consumer": 23,
     "token": "eeeeeeee"
     "quantity": 1

 },
 {
     "id": 19,
     "title": "Porta galleggiante gonfiabile",
     "description": "Divertimento assicurato per tutti gli amanti dello sport in riva al mare o in piscina, con pallone Intex incluso.",
     "image": "piscina.jpg",
     "timestamp": "2018-09-04T11:24:47.000Z",
     "price": 27.95,
     "valid_from": "2018-09-02T09:25:00.000Z",
     "valid_until": null,
     "state": 0,
     "constraints": "Nuoro (NU)",
     "owner": 1,
     "consumer": 23,
     "token": "gggggggg",
     "quantity": 1

 },
 {
     "id": 95,
     "title": "Ghetto Quarantasette ",
     "description": "Menu hamburger con birra artigianale o calice di vino e dolce per 2 al Ghetto Quarantasei (sconto fino a 62%).",
     "image": "resort.jpg",
     "timestamp": "2018-10-01T09:42:28.000Z",
     "price": 21.95,
     "valid_from": "2018-09-03T01:00:00.000Z",
     "valid_until": null,
     "state": 0,
     "constraints": "Oristano (OR), Viale Dei Principi 22",
     "owner": 1,
     "consumer": 23,
     "token": "50DFA03A2",
     "quantity": 1

 },
 {
     "id": 96,
     "title": "Ghetto Quarantasette ",
     "description": "Menu hamburger con birra artigianale o calice di vino e dolce per 2 al Ghetto Quarantasei (sconto fino a 62%).",
     "image": "resort.jpg",
     "timestamp": "2018-10-01T09:42:28.000Z",
     "price": 21.95,
     "valid_from": "2018-09-03T01:00:00.000Z",
     "valid_until": null,
     "state": 0,
     "constraints": "Oristano (OR), Viale Dei Principi 22",
     "owner": 1,
     "consumer": 23,
     "token": "50DFA03A3",
     "quantity": 1
 }
 ]
 *
 *
 * @apiError Unauthorized The user is not authorized to do the request.
 *
 *
 * * @apiErrorExample Error-Response:
 *      HTTP/1.1 401 Unauthorized
 *          {
                "error": "You are not authorized to view this content"
            }
 *
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 */

exports.getPurchasedCoupons = function (req, res, next) {
    // Coupon.findAll({
    //     where: { consumer: req.user.id }
    // })
    Sequelize.query('SELECT *, COUNT(*) AS quantity FROM coupons WHERE consumer = $1  GROUP BY token',
        { bind: [req.user.id], type: Sequelize.QueryTypes.SELECT },
        { model: Coupon })
        .then(coupons => {
            return res.status(HttpStatus.OK).json(coupons)
        })
        .catch(err => {
            // return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            //     error: err
            // })
            return res.send(JSON.stringify(err));
        });
};

/**
 * @api {get} /coupons/getAffordables Get Affordables Coupons
 * @apiName GetAffordables
 * @apiGroup Coupon
 * @apiPermission admin
 * @apiPermission consumer
 *
 * @apiHeader {String} Authorization Json Web Token retrieved from login request.
 *
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Authorization": "Bearer YW55X25hbWUiOm51bGwsInZhdF9udW1iZXIi"
 *     }
 *
 *
 * @apiSuccess {Object} ArrayJsonCoupons Array of Json Affordables Coupons

 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 {
     "id": 14,
     "title": "Pizzeria Baccu Mandara",
     "description": "Pizza all-you-can-eat per 2 persone da Pizzeria Baccu Mandara (sconto fino a 70%). Prenota&Vai!",
     "image": "pizzeria.jpg",
     "timestamp": "2018-08-04T07:04:27.000Z",
     "price": 19.95,
     "valid_from": "2018-09-03T20:22:00.000Z",
     "valid_until": "2019-01-01T00:00:00.000Z",
     "state": 0,
     "constraints": "Geremeas (CA), Loc. Baccu Mandara snc",
     "owner": 1,
     "consumer": null,
     "token": "eeeeeeee"
 },
 {
     "id": 19,
     "title": "Porta galleggiante gonfiabile",
     "description": "Divertimento assicurato per tutti gli amanti dello sport in riva al mare o in piscina, con pallone Intex incluso.",
     "image": "piscina.jpg",
     "timestamp": "2018-09-04T11:24:47.000Z",
     "price": 27.95,
     "valid_from": "2018-09-02T09:25:00.000Z",
     "valid_until": null,
     "state": 0,
     "constraints": "Nuoro (NU)",
     "owner": 1,
     "consumer": null,
     "token": "gggggggg",

 },
 {
     "id": 95,
     "title": "Ghetto Quarantasette ",
     "description": "Menu hamburger con birra artigianale o calice di vino e dolce per 2 al Ghetto Quarantasei (sconto fino a 62%).",
     "image": "resort.jpg",
     "timestamp": "2018-10-01T09:42:28.000Z",
     "price": 21.95,
     "valid_from": "2018-09-03T01:00:00.000Z",
     "valid_until": null,
     "state": 0,
     "constraints": "Oristano (OR), Viale Dei Principi 22",
     "owner": 1,
     "consumer": null,
     "token": "50DFA03A2",

 },
 {
     "id": 96,
     "title": "Ghetto Quarantasette ",
     "description": "Menu hamburger con birra artigianale o calice di vino e dolce per 2 al Ghetto Quarantasei (sconto fino a 62%).",
     "image": "resort.jpg",
     "timestamp": "2018-10-01T09:42:28.000Z",
     "price": 21.95,
     "valid_from": "2018-09-03T01:00:00.000Z",
     "valid_until": null,
     "state": 0,
     "constraints": "Oristano (OR), Viale Dei Principi 22",
     "owner": 1,
     "consumer": null,
     "token": "50DFA03A3",
 }
 ]
 *
 *
 * @apiError Unauthorized The user is not authorized to do the request.
 *
 *
 * @apiErrorExample Error-Response:
 *      HTTP/1.1 401 Unauthorized
 *          {
                "error": "You are not authorized to view this content"
            }
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 */

exports.getAffordables = function (req, res, next) {
    Coupon.findAll({
        where: {
            [Op.and]: [
                {
                    consumer: {
                        [Op.eq]: null    // coupon is not bought yet
                    }
                },
                {
                    valid_from: {
                        [Op.lte]: new Date()
                    }
                },
                {
                    valid_until: {
                        [Op.or]: [
                            { [Op.gte]: new Date() },
                            { [Op.eq]: null }
                        ]
                    }
                }
            ]
        }
    })
        .then(coupons => {
            return res.status(HttpStatus.OK).json(coupons)
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: 'Cannot GET coupons affordable'
            })
        });

};

/**
 * @api {get} /coupons/getDistinctAvailables Get Distinct Availables Coupons
 * @apiName GetDistinctAvailables
 * @apiGroup Coupon
 * @apiPermission admin
 * @apiPermission consumer
 * @apiPermission producer
 *
 * @apiHeader {String} Authorization Json Web Token retrieved from login request.
 *
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Authorization": "Bearer YW55X25hbWUiOm51bGwsInZhdF9udW1iZXIi"
 *     }
 *
 *
 * @apiSuccess {Object} ArrayJsonCoupons Array of Json Distinct Availables Coupons

 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 {
     "id": 14,
     "title": "Pizzeria Baccu Mandara",
     "description": "Pizza all-you-can-eat per 2 persone da Pizzeria Baccu Mandara (sconto fino a 70%). Prenota&Vai!",
     "image": "pizzeria.jpg",
     "timestamp": "2018-08-04T07:04:27.000Z",
     "price": 19.95,
     "valid_from": "2018-09-03T20:22:00.000Z",
     "valid_until": "2019-01-01T00:00:00.000Z",
     "state": 0,
     "constraints": "Geremeas (CA), Loc. Baccu Mandara snc",
     "owner": 1,
     "consumer": null,
     "token": "eeeeeeee"
     "quantity": 3

 },
 {
     "id": 19,
     "title": "Porta galleggiante gonfiabile",
     "description": "Divertimento assicurato per tutti gli amanti dello sport in riva al mare o in piscina, con pallone Intex incluso.",
     "image": "piscina.jpg",
     "timestamp": "2018-09-04T11:24:47.000Z",
     "price": 27.95,
     "valid_from": "2018-09-02T09:25:00.000Z",
     "valid_until": null,
     "state": 0,
     "constraints": "Nuoro (NU)",
     "owner": 1,
     "consumer": null,
     "token": "gggggggg",
     "quantity": 1

 },
 {
     "id": 95,
     "title": "Ghetto Quarantasette ",
     "description": "Menu hamburger con birra artigianale o calice di vino e dolce per 2 al Ghetto Quarantasei (sconto fino a 62%).",
     "image": "resort.jpg",
     "timestamp": "2018-10-01T09:42:28.000Z",
     "price": 21.95,
     "valid_from": "2018-09-03T01:00:00.000Z",
     "valid_until": null,
     "state": 0,
     "constraints": "Oristano (OR), Viale Dei Principi 22",
     "owner": 1,
     "consumer": null,
     "token": "50DFA03A2",
     "quantity": 1

 },
 {
     "id": 96,
     "title": "Ghetto Quarantasette ",
     "description": "Menu hamburger con birra artigianale o calice di vino e dolce per 2 al Ghetto Quarantasei (sconto fino a 62%).",
     "image": "resort.jpg",
     "timestamp": "2018-10-01T09:42:28.000Z",
     "price": 21.95,
     "valid_from": "2018-09-03T01:00:00.000Z",
     "valid_until": null,
     "state": 0,
     "constraints": "Oristano (OR), Viale Dei Principi 22",
     "owner": 1,
     "consumer": null,
     "token": "50DFA03A3",
     "quantity": 777
 }
 ]
 *
 *
 * @apiError Unauthorized The user is not authorized to do the request.
 *
 * @apiErrorExample Error-Response:
 *      HTTP/1.1 401 Unauthorized
 *          {
                "error": "You are not authorized to view this content"
            }
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 */

exports.getDistinctCoupons = function(req, res, next) {
    Sequelize.query('SELECT *, COUNT(*) AS quantity FROM coupons WHERE consumer IS NULL AND state = 0 GROUP BY title, description, price', { model: Coupon })
        .then(coupons => {
            return res.status(HttpStatus.OK).send(coupons);
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the distinct coupons'
            })
        })
};
/**
 * @api {get} /coupons/getDistinctCreatedCoupons Get Distinct Created Coupons
 * @apiName GetDistinctCreatedCoupons
 * @apiGroup Coupon
 * @apiPermission admin
 * @apiPermission producer
 *
 * @apiHeader {String} Authorization Json Web Token retrieved from login request.
 *
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Authorization": "Bearer YW55X25hbWUiOm51bGwsInZhdF9udW1iZXIi"
 *     }
 *
 *
 * @apiSuccess {Object} ArrayJsonCoupons Array of Json Distinct Created Coupons

 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 {
     "id": 14,
     "title": "Pizzeria Baccu Mandara",
     "description": "Pizza all-you-can-eat per 2 persone da Pizzeria Baccu Mandara (sconto fino a 70%). Prenota&Vai!",
     "image": "pizzeria.jpg",
     "timestamp": "2018-08-04T07:04:27.000Z",
     "price": 19.95,
     "valid_from": "2018-09-03T20:22:00.000Z",
     "valid_until": "2019-01-01T00:00:00.000Z",
     "state": 0,
     "constraints": "Geremeas (CA), Loc. Baccu Mandara snc",
     "owner": 1,
     "consumer": null,
     "token": "eeeeeeee"
     "quantity": 3

 },
 {
     "id": 19,
     "title": "Porta galleggiante gonfiabile",
     "description": "Divertimento assicurato per tutti gli amanti dello sport in riva al mare o in piscina, con pallone Intex incluso.",
     "image": "piscina.jpg",
     "timestamp": "2018-09-04T11:24:47.000Z",
     "price": 27.95,
     "valid_from": "2018-09-02T09:25:00.000Z",
     "valid_until": null,
     "state": 0,
     "constraints": "Nuoro (NU)",
     "owner": 1,
     "consumer": null,
     "token": "gggggggg",
     "quantity": 1

 },
 {
     "id": 95,
     "title": "Ghetto Quarantasette ",
     "description": "Menu hamburger con birra artigianale o calice di vino e dolce per 2 al Ghetto Quarantasei (sconto fino a 62%).",
     "image": "resort.jpg",
     "timestamp": "2018-10-01T09:42:28.000Z",
     "price": 21.95,
     "valid_from": "2018-09-03T01:00:00.000Z",
     "valid_until": null,
     "state": 0,
     "constraints": "Oristano (OR), Viale Dei Principi 22",
     "owner": 1,
     "consumer": 23,
     "token": "50DFA03A2",
     "quantity": 1

 },
 {
     "id": 96,
     "title": "Ghetto Quarantasette ",
     "description": "Menu hamburger con birra artigianale o calice di vino e dolce per 2 al Ghetto Quarantasei (sconto fino a 62%).",
     "image": "resort.jpg",
     "timestamp": "2018-10-01T09:42:28.000Z",
     "price": 21.95,
     "valid_from": "2018-09-03T01:00:00.000Z",
     "valid_until": null,
     "state": 0,
     "constraints": "Oristano (OR), Viale Dei Principi 22",
     "owner": 1,
     "consumer": null,
     "token": "50DFA03A3",
     "quantity": 777
 }
 ]
 *
 *
 * @apiError Unauthorized The user is not authorized to do the request.
 * @apiErrorExample Error-Response:
 *      HTTP/1.1 401 Unauthorized
 *          {
                "error": "You are not authorized to view this content"
            }
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 */

exports.getDistinctCreatedCoupons = function(req, res, next) {
    Sequelize.query('SELECT *, COUNT(*) AS quantity FROM coupons WHERE owner = $1 GROUP BY title, description, price',
        { bind: [req.user.id], type: Sequelize.QueryTypes.SELECT },
        { model: Coupon })
        .then(coupons => {
            return res.status(HttpStatus.OK).send(coupons);
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the distinct coupons created'
            })
        })
};


/**
 * @api {get} /coupons/getCouponsCreatedFromTitleDescriptionPrice/:title/:description/:price Get Distinct Created Coupons
 * @apiName GetCouponsCreatedFromTitleDescriptionPrice
 * @apiGroup Coupon
 * @apiPermission admin
 * @apiPermission producer
 * @apiPermission consumer
 *
 * @apiHeader {String} Authorization Json Web Token retrieved from login request.
 *
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Authorization": "Bearer YW55X25hbWUiOm51bGwsInZhdF9udW1iZXIi"
 *     }
 *
 *
 * @apiSuccess {Object} ArrayJsonCoupons Array of Json Distinct Coupons

 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 {
     "id": 14,
     "title": "Pizzeria Baccu Mandara",
     "description": "Pizza all-you-can-eat per 2 persone da Pizzeria Baccu Mandara (sconto fino a 70%). Prenota&Vai!",
     "image": "pizzeria.jpg",
     "timestamp": "2018-08-04T07:04:27.000Z",
     "price": 19.95,
     "valid_from": "2018-09-03T20:22:00.000Z",
     "valid_until": "2019-01-01T00:00:00.000Z",
     "state": 0,
     "constraints": "Geremeas (CA), Loc. Baccu Mandara snc",
     "owner": 1,
     "consumer": null,
     "token": "eeeeeeee"
     "quantity": 3

 },
 {
     "id": 19,
     "title": "Porta galleggiante gonfiabile",
     "description": "Divertimento assicurato per tutti gli amanti dello sport in riva al mare o in piscina, con pallone Intex incluso.",
     "image": "piscina.jpg",
     "timestamp": "2018-09-04T11:24:47.000Z",
     "price": 27.95,
     "valid_from": "2018-09-02T09:25:00.000Z",
     "valid_until": null,
     "state": 0,
     "constraints": "Nuoro (NU)",
     "owner": 1,
     "consumer": null,
     "token": "gggggggg",
     "quantity": 1

 },
 {
     "id": 95,
     "title": "Ghetto Quarantasette ",
     "description": "Menu hamburger con birra artigianale o calice di vino e dolce per 2 al Ghetto Quarantasei (sconto fino a 62%).",
     "image": "resort.jpg",
     "timestamp": "2018-10-01T09:42:28.000Z",
     "price": 21.95,
     "valid_from": "2018-09-03T01:00:00.000Z",
     "valid_until": null,
     "state": 0,
     "constraints": "Oristano (OR), Viale Dei Principi 22",
     "owner": 1,
     "consumer": 23,
     "token": "50DFA03A2",
     "quantity": 1

 },
 {
     "id": 96,
     "title": "Ghetto Quarantasette ",
     "description": "Menu hamburger con birra artigianale o calice di vino e dolce per 2 al Ghetto Quarantasei (sconto fino a 62%).",
     "image": "resort.jpg",
     "timestamp": "2018-10-01T09:42:28.000Z",
     "price": 21.95,
     "valid_from": "2018-09-03T01:00:00.000Z",
     "valid_until": null,
     "state": 0,
     "constraints": "Oristano (OR), Viale Dei Principi 22",
     "owner": 1,
     "consumer": null,
     "token": "50DFA03A3",
     "quantity": 777
 }
 ]
 *
 *
 * @apiError Unauthorized The user is not authorized to do the request.
 *
 * @apiErrorExample Error-Response:
 *      HTTP/1.1 401 Unauthorized
 *          {
                "error": "You are not authorized to view this content"
            }
 *
 *
 * @apiErrorExample Error-Response:
 *      HTTP/1.1 200 OK
 * {
    "error": "No coupon found with the data and the given user",
    "user_id": 23
}
 *
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 */

exports.getCouponsCreatedFromTitleDescriptionPrice = function(req, res, next) {

    console.log('dati arrivati:', req.params.title, req.params.description, req.params.price)
    let description;
    if(req.params.description == 'null'){
        description = null;
    } else {
        description = req.params.description;
    }
    Coupon.findAll({
        where: {
            title: req.params.title,
            description: description,
            price: Number(req.params.price),
            // [Op.or]: [
            //     {owner: req.user.id},
            //
            // ]
        },
        like: {
            price: Number(req.params.price),
        }
    }).then(coupons => {
        if (coupons.length === 0) {
            return res.status(HttpStatus.OK).json({
                error: 'No coupon found with the data and the given user',
                token: req.params.token,
                user_id: req.user.id
            })
        }

        return res.status(HttpStatus.OK).json(coupons)
    }).catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the distinct coupons created'
            })
        })
};

/**
 * @api {put} /coupons/update Update coupon
 * @apiName UpdateCoupon
 * @apiGroup Coupon
 * @apiPermission admin
 * @apiPermission producer
 *
 * @apiParam {Number} id id of coupon (required) (into body).
 * @apiParam {String} title title of coupon (required) (into body).
 * @apiParam {String} description description of the coupon (into body).
 * @apiParam {String} image image of the coupon (into body json).
 * @apiParam {String} price price of the coupon (into body json).
 * @apiParam {String} valid_from Valid from of the coupon (required) (into body).
 * @apiParam {String} valid_until Valid until of the coupon (into body).
 * @apiParam {String} constraints constraints of the coupon (into body).
 * @apiParam {String} owner owner of the coupon (required) (into body).
 * @apiParam {String} consumer consumer of the coupon (into body).
 * @apiParam {String} constraints constraints of the coupon (into body).

 * @apiHeader {String} Authorization Json Web Token retrieved from login request.
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Authorization": "Bearer YW55X25hbWUiOm51bGwsInZhdF9udW1iZXIi"
 *     }
 *
 *
 * @apiSuccess {Number} id Identifier of the Coupon.


 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *          updated: true,
            coupon_id: 12
 *
 *     }
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal Server Error
 *      Error: child "body" fails because [child "id" fails because ["id" is required]]......
 *
 * @apiErrorExample Error-Response:
 *      http/1.1 401 Unauthorized
 *          {"error":"You are not authorized to view this content"}
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 */

exports.update = function (req, res, next) {
    const data = req.body;
    let valid_until = data.valid_until === null ? null : Number(data.valid_until);

    Coupon.update({
        title: data.title,
        description: data.description,
        image: data.image,
        price: data.price,
        valid_from: Number(data.valid_from),
        valid_until: valid_until,
        state: data.state,
        constraints: data.constraints,
        quantity: data.quantity,
        token:data.token,
    }, {
        where: {
            [Op.and]: [
                {owner: req.user.id},
                {id: data.id}
            ]
        }
    })
        .then(couponUpdated => {
            return res.status(HttpStatus.OK).json({
                updated: true,
                coupon_id: data.id
            })
        })
        .catch(err => {
            console.log(err);

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                updated: false,
                coupon_id: data.id,
                error: 'Cannot update the coupon'
            })
        });
};

/**
 * @api {delete} /coupons/delete Delete coupon
 * @apiName DeleteCoupon
 * @apiGroup Coupon
 * @apiPermission admin
 * @apiPermission producer
 *
 * @apiParam {Number} id id of coupon (required) (into body).

 * @apiHeader {String} Authorization Json Web Token retrieved from login request.
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Authorization": "Bearer YW55X25hbWUiOm51bGwsInZhdF9udW1iZXIi"
 *     }
 *
 *
 * @apiSuccess {Number} id Identifier of the Coupon.


 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *          deleted: true,
            coupon: 12,
            message: "Coupon deleted!!"
 *
 *     }
 *
 * * @apiErrorExample Error-Response:
 *     HTTP/1.1 200 OK
 *     {
 *          deleted: false,
            coupon: 12,
            message: This coupon don't exist!!
 *
 *     }
 *   @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *     {
            "error": "You are not authorized to view this content"
        }
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 */

exports.delete = function (req, res, next) {
    Coupon.destroy({
        where: {
            [Op.and]: [
                {id: req.body.id},
                {owner: req.user.id}
            ]
        }
    })
        .then((coupon) =>  {
            if (coupon === 0){
            return res.status(HttpStatus.OK).json({
                deleted: false,
                coupon: parseInt(req.body.id),
                message: "This coupon don't exist!!"
            })}
            else if (coupon === 1) {
                return res.status(HttpStatus.OK).json({
                    deleted: true,
                    coupon: parseInt(req.body.id),
                    message: "Coupon deleted!!"

                })
            }
        })
        .catch(err => {
            console.log(err);

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                deleted: false,
                coupon: parseInt(req.body.id),
                error: 'Cannot delete the coupon'
            })
        })
};



exports.addImage = function (req, res, next) {
    // console.log(req);

    fs.readFile(req.files.file.path, function (err, data) {
        // set the correct path for the file not the temporary one from the API:
        const file = req.files.file;
        file.path = path.join(__dirname, "../media/images/" + file.name);

        // copy the data from the req.files.file.path and paste it to file.path
        fs.writeFile(file.path, data, function (err) {
            if (err) {
                console.warn(err);

                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                    name: 'Upload Image Error',
                    message: 'A problem occurred during upload of the image'
                })
            }

            return res.status(HttpStatus.CREATED).send({
                inserted: true,
                image: file.name,
                path: file.path
            });
        });
    });
};

/**
 * @api {post} /coupons/buyCoupon Buy coupon
 * @apiName BuyCoupon
 * @apiGroup Coupon
 * @apiPermission consumer
 *
 * @apiParam {Number} id id of coupon (required) (into body).

 * @apiHeader {String} Authorization Json Web Token retrieved from login request.
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Authorization": "Bearer YW55X25hbWUiOm51bGwsInZhdF9udW1iZXIi"
 *     }
 *
 *
 * @apiSuccess {Number} id Identifier of the Coupon.


 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *          updated: true,
 *          coupon_id: 12
 *          message: "Coupon bought!!!"
 *     }
 *
 * * @apiErrorExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *          updated: false,
 *          coupon_id: 12
 *          message: "Coupon don't exist!!!"
 *     }
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          {
 *              "error": "You are not authorized to view this content"
 *           }
 */

exports.buyCoupon = function (req, res, next) {
  let couponID = req.body.coupon_id;

  console.log("coupon id: " + couponID);

  Coupon.update({
      consumer: req.user.id,
      state: 1,
  }, {
      where: {
          id: couponID
      }
  })
      .then(bought => {
          if (bought[0] === 0){
          return res.status(HttpStatus.OK).json({
              buy: false,
              coupon_id: couponID,
              message: "Coupon don't exist!!!"
          })}
          else if (bought[0] === 1) {
              return res.status(HttpStatus.OK).json({
                  buy: true,
                  coupon_id: couponID,
                  message: "Coupon bought!!!"

              })
          }
      })
      .catch(err => {
          console.log(err);

          return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
              updated: false,
              coupon_id: couponID,
              error: 'Cannot buy the coupon'
          })
      });
};


/**
 * @api {put} /coupons/importCoupon Import coupon
 * @apiName ImportCoupon
 * @apiGroup Coupon
 * @apiPermission consumer
 * @apiPermission producer
 * @apiPermission admin
 *
 * @apiParam {String} token token of coupon (required) (into body).

 * @apiHeader {String} Authorization Json Web Token retrieved from login request.
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "Authorization": "Bearer YW55X25hbWUiOm51bGwsInZhdF9udW1iZXIi"
 *     }
 *
 *
 * @apiSuccess {String} Token token Identifier of the Coupon.


 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *          validate: true,
 *          token: xdx200QW
 *
 *     }
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 *
 * @apiErrorExample Error-Response:
        HTTP/1.1 200 OK
 *     {
 *        validate: false,
 *        token: DX200DT,
 *         error: 'Cannot import coupon'
 *     }
 */
exports.importCoupon = function (req, res, next) {
    const data = req.body;

    Coupon.update({
        consumer: req.user.id,
        token:data.token,
        state:data.state,
    }, {
        where: {
            [Op.and]: [
                {token:data.token},
                {state: 3},
            ]
        }
    })
        .then(couponUpdated =>  { if (couponUpdated[0] === 0){
            return res.status(HttpStatus.OK).json({
                validate: false,
                token: data.token,
                error: 'Cannot import coupon'
            })}
            else if (couponUpdated[0] === 1) {

            {
                return res.status(HttpStatus.OK).json({
                    validate: true,
                    token: data.token
                })}
        }
        })
        .catch(err => {
            console.log(err);

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                validate: false,
                token: data.token,
                error: 'Cannot import coupon'
            })
        });
};
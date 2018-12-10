'use strict';

const Coupon = require('../models/index').Coupon;
const CouponToken = require('../models/index').CouponToken;
const Verifier = require('../models/index').Verifier;
const Sequelize = require('../models/index').sequelize;
const Op = require('../models/index').Sequelize.Op;

const CouponTokenManager = require('./coupon-token-manager');

const HttpStatus = require('http-status-codes');
const fs = require('file-system');
const path = require('path');
const crypto = require('crypto');

/**
 * @api {post} /coupons/create Create coupon
 * @apiName CreateCoupon
 * @apiGroup Coupon
 * @apiPermission admin
 * @apiPermission producer
 *
 * @apiParam {String} title title of coupon (required) .
 * @apiParam {String} description description of the coupon .
 * @apiParam {String} image image of the coupon .
 * @apiParam {String} price price of the coupon .
 * @apiParam {String} valid_from Valid from of the coupon (required) .
 * @apiParam {String} valid_until Valid until of the coupon .
 * @apiParam {String} constraints constraints of the coupon .
 * @apiParam {String} owner owner of the coupon (required) .
 * @apiParam {String} consumer consumer of the coupon .
 * @apiParam {String} constraints constraints of the coupon .

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
 *      HTTP/1.1 400 Bad request
 *      {
            "Status Code": 400,
            "Type error": "Bad Request",
            "message": "the title must be between 5 and 40 characters long, is required "
        }
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 */
exports.createCoupon = async function (req, res) {
    const data = req.body;
    let result;

    try {
        result = await insertCoupon(data, req.user.id);
    } catch (e) {
        console.log(e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'Error inserting the new coupon.',
        });
    }

    if (result) { // If the coupon has been created
        for (let i = 0; i < data.quantity; i++) {
            const token = generateUniqueToken(data.title, req.user.password);
            let newToken;

            try {
                newToken = await CouponTokenManager.insertCouponToken(result.get('id'), token);
            } catch (e) {
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                    error: true,
                    message: 'Error creating the tokens.',
                    tokens_created: (i + 1)
                });
            }

            if (!newToken) {
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                    error: true,
                    message: 'Error creating the tokens.',
                    tokens_created: (i + 1)
                });
            }
        }

        return res.status(HttpStatus.CREATED).send({
            created: true,
            title: data.title,
            quantity: data.quantity
        });

    } else {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'Error inserting the new coupon.',
        });
    }

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
 *     @apiErrorExample Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
            "Status Code": 400,
            "Type error": "Bad Request",
            "message": "Id is required"
        }
 *
 * @apiError Unauthorized The user is not authorized to do the request.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 */
exports.getFromId = function (req, res) {

    Coupon.findOne({
        where: {id: req.params.coupon_id}
    })
        .then(coupon => {
            if (coupon === null) {
                return res.status(HttpStatus.NO_CONTENT).send({
                    error: 'No coupon found with the given id.',
                    coupon_id: parseInt(req.params.coupon_id),
                })
            }

            return res.status(HttpStatus.OK).send(coupon)
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
 * @api {get} /coupons/getProducerCoupons Get Created Coupons from Token
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
exports.getProducerCoupons = function (req, res) {
    Sequelize.query(
        'SELECT id, title, description, image, price, visible_from, valid_from, valid_until, purchasable, constraints, owner, ' +
        'COUNT(CASE WHEN consumer IS NOT null AND verifier IS null THEN 1 END) AS buyed, COUNT(*) AS quantity ' +
        'FROM coupons JOIN coupon_tokens ON coupons.id = coupon_tokens.coupon_id WHERE owner = $1 ' +
        'GROUP BY id',
        {bind: [req.user.id], type: Sequelize.QueryTypes.SELECT},
        {model: Coupon})
        .then(coupons => {
            if (coupons.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send({});
            }
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
exports.getPurchasedCoupons = function (req, res) {
    Coupon.findAll({ // Join con CouponToken
        include: [{model: CouponToken, required: true, where: {consumer: req.user.id}}],
    })
        .then(coupons => {
            if (coupons.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send({});
            }
            return res.status(HttpStatus.OK).send(coupons);
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Error retrieving purchased coupons'
            })
        });
};

/**
 * @api {get} /coupons/getAvailableCoupons Get Affordables Coupons
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
exports.getAvailableCoupons = function (req, res) {
    Sequelize.query(
        'SELECT id, title, description, image, price, visible_from, valid_from, valid_until, purchasable, constraints, owner, ' +
        ' COUNT(*) AS quantity FROM coupon_tokens JOIN coupons ' +
        'ON coupons.id = coupon_tokens.coupon_id WHERE consumer IS null AND coupons.visible_from IS NOT null ' +
        'AND coupons.visible_from <= CURRENT_TIMESTAMP  AND coupons.valid_from <= CURRENT_TIMESTAMP ' +
        'AND (coupons.valid_until >= CURRENT_TIMESTAMP  OR coupons.valid_until IS null) GROUP BY coupons.id',
        {type: Sequelize.QueryTypes.SELECT},
        {model: Coupon}
    )
        .then(coupons => {
            if (coupons.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send({});
            }
            return res.status(HttpStatus.OK).send(coupons)
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: 'Cannot GET coupons affordable'
            })
        });

};

exports.buyCoupons = async function (req, res) {

    const coupon_list = req.body.coupon_list;
    let query = 'START TRANSACTION; ';
    let tokenToExclude = [];
    let buyCouponQuery;
    let buyQueryResult;

    let lockTable = await lockTable('coupon_tokens');

    if(!lockTable) { // TODO unlock tables
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'An error occurred while finalizing the purchase'
        });
    }

    for (let i = 0; i < coupon_list.length; i++) {
        try {
            tokenToExclude = [];

            for (let j=0;j < coupon_list[i].quantity; j++) {
                buyQueryResult = await getBuyCouponQuery(coupon_list[i].id, req.user.id, tokenToExclude);
                buyCouponQuery = buyQueryResult[0];
                tokenToExclude.push(buyQueryResult[1]);

                if (buyCouponQuery !== null) {
                    query += buyCouponQuery;
                } else {
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                        error: true,
                        message: 'An error occurred while finalizing the purchase'
                    })
                }
            }
        } catch (e) {
            return res.status(e[0]).send({
                error: true,
                message: 'An error occurred while finalizing the purchase'
            })
        }
    }

    query += 'COMMIT';

    Sequelize.query(query, {type: Sequelize.QueryTypes.UPDATE}, {model: CouponToken})
        .then(result => {
            if (result[0] === 0) { // The database has not been updated
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                    error: true,
                    message: 'An error occured while finalizing the purchase'
                });
            }

            return res.status(HttpStatus.OK).send({
                success: true,
                message: 'The purchase has been finalized'
            })
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'An error occured while finalizing the purchase'
            });
        });
};

/**
 * @api {post} /coupons/buyCoupon Buy coupon
 * @apiName BuyCoupon
 * @apiGroup Coupon
 * @apiPermission consumer
 *
 * @apiParam {Number} id id of coupon (required).

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
async function getBuyCouponQuery(coupon_id, user_id, tokenExcluded=[]) {

    let isNotExpired;
    let isPurchasable;

    try {
        isNotExpired = await isCouponNotExpired(coupon_id);
        isPurchasable = await isCouponPurchasable(coupon_id, user_id);
    } catch (err) {
        console.log('ERROR in COUPON-MANAGER,\nwhen checking if coupon with ID=' + coupon_id + ' is expired/purchasable:');
        console.log(err);
        return null;
    }

    // If the coupon is not expired and is purchasable
    return new Promise((resolve, reject) => {
        if (isNotExpired && isPurchasable) {
            CouponToken.findOne({
                where: {[Op.and]: [{consumer: {[Op.is]: null}}, {coupon_id: coupon_id}, {token: {[Op.notIn]: tokenExcluded}}]} // consumer == null AND given coupon_id
            })
                .then(coupon => {
                    if (coupon === null) {
                        console.log('ERROR in COUPON-MANAGER:');
                        console.log('USER=' + user_id + ' asked for buying an unknown coupon with ID=' + coupon_id);
                        reject([HttpStatus.BAD_REQUEST, null]);
                    }

                    // TODO check the UPDATE query below

                    resolve(['UPDATE `coupon_tokens` SET `consumer`=' + user_id + ' WHERE `coupon_id`=' + coupon_id + ' AND `token`="' + coupon.dataValues.token + '"; ', coupon.dataValues.token]);
                    /*
                    CouponTokenManager.updateCouponToken(token, coupon_id, user_id)
                        .then(update => {
                            if (update) {
                                return res.status(HttpStatus.OK).send({
                                    bought: true,
                                    token: token,
                                    coupon_id: coupon_id
                                });
                            } else {
                                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                                    error: true,
                                    message: 'Some problem occurred during the buy of the coupon.'
                                })
                            }
                        })
                        .catch(err => {
                            console.log(err);
                            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                                error: true,
                                message: 'Error while buying the coupon.'
                            })
                        });
                        */
                })
                .catch(err => {
                    console.log('ERROR in COUPON-MANAGER,\nwhen retrieving a token for the coupon with ID=' + coupon_id + ':');
                    console.log(err);
                    reject([HttpStatus.INTERNAL_SERVER_ERROR, null]);
                })
        } else {
            console.log('ERROR in COUPON MANAGER:\nCoupon with ID=' + coupon_id + ' is not purchasable or expired');
            reject([HttpStatus.BAD_REQUEST, null]);
        }
    });
};

/**
 * @api {put} /coupons/editCoupon Update coupon
 * @apiName UpdateCoupon
 * @apiGroup Coupon
 * @apiPermission admin
 * @apiPermission producer
 *
 * @apiParam {Number} id id of coupon (required) .
 * @apiParam {String} title title of coupon (required) .
 * @apiParam {String} description description of the coupon .
 * @apiParam {String} image image of the coupon .
 * @apiParam {String} price price of the coupon .
 * @apiParam {String} valid_from Valid from of the coupon (required) .
 * @apiParam {String} valid_until Valid until of the coupon .
 * @apiParam {String} constraints constraints of the coupon .
 * @apiParam {String} owner owner of the coupon (required) .
 * @apiParam {String} consumer consumer of the coupon .
 * @apiParam {String} constraints constraints of the coupon .

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
 *
 *
 *
 * @apiErrorExample Error-Response:
 *      HTTP/1.1 200 Ok
 *              {
                    updated: false,
                    coupon_id: 12,
                    message: "This coupon don't exist"
                }

 *
 *
 * @apiErrorExample Error-Response:
 *      HTTP/1.1 400 Bad request
 *      {
            "Status Code": 400,
            "Type error": "Bad Request",
            "message": "the title must be between 5 and 40 characters long, is required "
        }


 * @apiErrorExample Error-Response:
 *      http/1.1 401 Unauthorized
 *          {"error":"You are not authorized to view this content"}
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *          Unauthorized
 */
exports.editCoupon = function (req, res) {
    const data = req.body;
    let valid_until = data.valid_until === null ? null : Number(data.valid_until);
    let visible_from = data.visible_from === null ? null : Number(data.visible_from);
    Coupon.update({
        title: data.title,
        description: data.description,
        image: data.image,
        price: data.price,
        visible_from: visible_from,
        valid_from: Number(data.valid_from),
        valid_until: valid_until,
        constraints: data.constraints,
        purchasable: data.purchasable,
    }, {
        where: {
            [Op.and]: [
                {owner: req.user.id},
                {id: data.id}
            ]
        }
    })
        .then(couponUpdated => {
            // console.log('couponUpdated', couponUpdated);
            if (couponUpdated[0] === 0) {
                return res.status(HttpStatus.NO_CONTENT).json({
                    updated: false,
                    coupon_id: data.id,
                    message: "This coupon doesn't exist"
                })
            }
            else {
                return res.status(HttpStatus.OK).json({
                    updated: true,
                    coupon_id: data.id
                })
            }
        })
        .catch(err => {
            console.log(err);

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                updated: false,
                coupon_id: data.id,
                error: 'Cannot edit the coupon'
            })
        });
};

/**
 * @api {deleteCoupon} /coupons/deleteCoupon Delete coupon
 * @apiName DeleteCoupon
 * @apiGroup Coupon
 * @apiPermission admin
 * @apiPermission producer
 *
 * @apiParam {Number} id id of coupon (required).

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
exports.deleteCoupon = function (req, res) {
    Coupon.destroy({
        where: {
            [Op.and]: [
                {id: req.body.id},
                {owner: req.user.id}
            ]
        }
    })
        .then(coupon => {
            if (coupon === 0) {
                return res.status(HttpStatus.NO_CONTENT).json({
                    deleted: false,
                    coupon: parseInt(req.body.id),
                    message: "This coupon doesn't exist or you doesn't own the coupon!"
                });
            } else {
                return res.status(HttpStatus.OK).json({
                    deleted: true,
                    coupon: parseInt(req.body.id),
                });
            }
        })
        .catch(err => {
            console.log(err);

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                deleted: false,
                coupon: parseInt(req.body.id),
                error: 'Cannot deleteCoupon the coupon'
            })
        })
};

/**
 * @api {put} /coupons/importOfflineCoupon Import coupon
 * @apiName ImportCoupon
 * @apiGroup Coupon
 * @apiPermission consumer
 * @apiPermission producer
 * @apiPermission admin
 *
 * @apiParam {String} token token of coupon (required).

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
exports.importOfflineCoupon = function (req, res) {
    const data = req.body;

    CouponToken.findOne({
        where: {


            [Op.and]: [
                {consumer: {[Op.is]: null}},
                {verifier: {[Op.is]: null}},
                {token: data.token},
            ]
        }
    })
        .then(coupon => {
            if (coupon === null) {
                return res.status(HttpStatus.NO_CONTENT).json({
                    error: 'No coupon found with the given token.',
                    token: data.token,
                })
            }

            CouponTokenManager.updateCouponToken(data.token, coupon.dataValues.coupon_id, req.user.id)
                .then(update => {
                    if (update) {
                        return res.status(HttpStatus.OK).send({
                            imported: true,
                            token: data.token,
                            coupon_id: coupon.dataValues.coupon_id
                        });
                    }

                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                        error: true,
                        message: 'Some problem occurred during the import of the offline coupon.'
                    })
                });
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Some problem occurred during the import of the offline coupon.'
            })
        })
};

/**
 * @api {put} /coupons/redeemCoupon Verifier coupon
 * @apiName VerifierCoupon
 * @apiGroup Coupon
 * @apiPermission verifier
 * @apiPermission admin
 *
 * @apiParam {String} token token of coupon (required).

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
 *         error: 'Cannot verifier coupon'
 *     }
 */
exports.redeemCoupon = function (req, res) {
    const data = req.body;
    const verifier_id = req.user.id;

    // Join between CouponToken and Coupon where token = givenToken and consumer is not null
    CouponToken.findOne({
        include: [{model: Coupon, required: true}],
        where: {
            [Op.and]: [
                {token: data.token}, {consumer: {[Op.not]: null}}, {verifier: {[Op.is]: null}}
            ]
        }
    })
        .then(result => {
            if (result === null) {
                return res.status(HttpStatus.BAD_REQUEST).send({
                    error: true,
                    message: 'Either the coupon is not found, unsold or already redeemed.',
                })
            }

            const couponTkn = {
                token: data.token,
                coupon_id: result.dataValues.coupon_id,
                consumer: result.dataValues.consumer
            };
            const producer_id = result.dataValues.Coupons[0].dataValues.owner;

            isVerifierAuthorized(producer_id, verifier_id)
                .then(authorization => {
                    if (authorization) { // If the verifier is authorized, it redeems the coupon
                        console.log('I can redeem the coupon');

                        CouponTokenManager.updateCouponToken(couponTkn.token, couponTkn.coupon_id, couponTkn.consumer, verifier_id)
                            .then(update => {
                                console.log(update);
                                if (update) {
                                    return res.status(HttpStatus.OK).send({
                                        redeemed: true,
                                        token: data.token,
                                    });
                                } else {
                                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                                        error: true,
                                        message: 'Some problem occurred during the operation of redeeming.'
                                    });
                                }
                            })
                            .catch(err => {
                                console.log(err);

                                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                                    error: true,
                                    message: 'Some problem occurred during the operation of redeeming.'
                                })
                            })
                    } else {
                        return res.status(HttpStatus.BAD_REQUEST).send({
                            error: true,
                            message: 'Either you are not authorized to redeem the selected coupon or the coupon was already redeemed.',
                        })
                    }
                })
                .catch(err => {
                    console.log(err);

                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                        error: true,
                        message: 'Some problem occurred during the operation of redeeming.'
                    })
                })
        })
        .catch(err => {
            console.log(err);

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Some problem occurred during the redeem of the coupon.'
            })
        })
};

exports.addImage = function (req, res) {
    console.log(req);

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

    // return res.send({cacca: 'si'});
};

function generateUniqueToken(title, password) { // Generates a 8-char unique token based on the coupon title and the user (hashed) passwpord

    const min = Math.ceil(1);
    const max = Math.floor(1000000);
    const total = Math.floor(Math.random() * (max - min)) + min;

    // console.log('total', total);

    let hash = crypto.createHash('sha256').update(title + password + total.toString()).digest('hex').substr(0, 8).toUpperCase();
    // console.log('COUPON HASH: ' + hash);

    return hash;
}

async function isCouponNotExpired(coupon_id) {
    return new Promise((resolve, reject) => {
        Coupon.findOne({
            attributes: ['valid_until'],
            where: {id: coupon_id}
        })
            .then(coupon => {
                // If the coupon exists, it check if is expired or not.
                // If the coupon is not found, it returns true (such as expired)
                const result = coupon !== null
                    ? (coupon.get('valid_until') >= Date.now() || coupon.get('valid_until') === null)
                    : false;

                resolve(result);
            })
            .catch(err => {
                console.log(err);
                reject(err);
            })
    });
}

async function isCouponPurchasable(coupon_id, user_id) {
    // It returns id, purchasable, quantity, available and buyed

    return new Promise((resolve, reject) => {

        Sequelize.query('SELECT id, purchasable, COUNT(*) AS quantity, ' +
            'COUNT(CASE WHEN consumer IS NULL THEN 1 END) AS availables, ' +
            'COUNT(CASE WHEN consumer = $1 THEN 1 END) AS buyed ' +
            'FROM coupons JOIN coupon_tokens ON coupons.id = coupon_tokens.coupon_id WHERE id = $2 GROUP BY id',
            {bind: [user_id, coupon_id], type: Sequelize.QueryTypes.SELECT},
            {model: Coupon}
        )
            .then(infos => {
                const queryResult = infos[0];

                // If purchasable is not null, then it checks only for availability, else it checks if you can buy the coupon
                const result = queryResult.purchasable === null // null == infinite availability
                    ? queryResult.availables > 0
                    : queryResult.availables > 0 && queryResult.buyed < queryResult.purchasable;
                resolve(result);
            })
            .catch(err => {
                console.log(err);
                reject(err); // Error == couponNotPurchasable
            })
    });
}

async function isVerifierAuthorized(producer_id, verifier_id) {
    return new Promise((resolve, reject) => {
        Verifier.findOne({
            where: {
                [Op.and]: [
                    {producer: producer_id}, {verifier: verifier_id}
                ]
            }
        })
            .then(result => { // If result !== null, there is not a couple producer/verifier ==> verifier not authorized
                resolve(result !== null);
            })
            .catch(err => {
                console.log(err);
                reject(err);
            })
    });
}

async function insertCoupon(coupon, owner) {
    return new Promise((resolve, reject) => {
        Coupon.create({
            title: coupon.title,
            description: coupon.description,
            image: coupon.image,
            timestamp: Number(Date.now()),
            price: coupon.price,
            visible_from: coupon.visible_from === null ? null : Number(coupon.visible_from),
            valid_from: Number(coupon.valid_from),
            valid_until: coupon.valid_until === null ? null : Number(coupon.valid_until),
            purchasable: coupon.purchasable,
            constraints: coupon.constraints,
            owner: owner,
        })
            .then(newCoupon => {
                resolve(newCoupon);
            })
            .catch(err => {
                console.log(err);
                reject(err);
            })
    });
}

async function lockTable(table_name) {
    return new Promise((resolve, reject) => {
        Sequelize.query(
            'LOCK TABLE :table_name WRITE', {bind: [table_name]})
            .then(lock => {
                resolve(true);
            })
            .catch(err => {
                console.log(err);
                resolve(false);
            })
    });
}

async function unlockTables() {
    return new Promise((resolve, reject) => {
        Sequelize.query(
            'UNLOCK TABLES')
            .then(lock => {
                resolve(true);
            })
            .catch(err => {
                console.log(err);
                resolve(false);
            })
    });
}
'use strict';

const Coupon = require('../models/index').Coupon;
const CouponToken = require('../models/index').CouponToken;
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
exports.createCoupon = function (req, res) {
    const data = req.body;

    Coupon.create({
        title: data.title,
        description: data.description,
        image: data.image,
        timestamp: Number(Date.now()),
        price: data.price,
        visible_from: data.visible_from === null ? null : Number(data.visible_from),
        valid_from: Number(data.valid_from),
        valid_until: data.valid_until === null ? null : Number(data.valid_until),
        purchasable: data.purchasable,
        constraints: data.constraints,
        owner: req.user.id,
    })
        .then(newCoupon => {
            for (let i = 0; i < data.quantity; i++) {
                const token = generateUniqueToken(newCoupon.get('title'), req.user.password);
                const result = CouponTokenManager.insertCouponToken(newCoupon.get('id'), token);

                if (!result) {
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                        error: true,
                        message: 'Error creating the tokens.',
                        tokens_created: i
                    });
                }
            }

            return res.status(HttpStatus.CREATED).send({
                created: true,
                id: newCoupon.get('id'),
                title: newCoupon.get('title'),
                description: newCoupon.get('description')
            });
        })
        .catch(err => {
            console.log(err);

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'The coupon cannot be created.'
            });
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
 */ // TODO adattare
exports.getFromId = function (req, res) {

    Coupon.findOne({
        where: {
            [Op.and]: [
                {owner: req.user.id},
                {id: req.params.coupon_id}
            ]
        }
    })
        .then(coupon => {
            if (coupon === null) {
                return res.status(HttpStatus.NO_CONTENT).json({
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
 */ // TODO adattare e rendere coupon validi e disponibili (visibili, non scaduti, non acquistati, non riscattati)
exports.getAvailableCoupons = function (req, res) {
    Sequelize.query(
        'SELECT id, title, description, image, price, visible_from, valid_from, valid_until, purchasable, constraints, owner, ' +
        ' COUNT(*) AS quantity FROM coupon_tokens  LEFT JOIN coupons ' +
        'ON coupons.id = coupon_tokens.coupon_id WHERE consumer IS null AND coupons.visible_from IS NOT null ' +
        'AND coupons.visible_from <= CURRENT_TIMESTAMP AND coupons.valid_from <= CURRENT_TIMESTAMP ' +
        'AND (coupons.valid_until >= CURRENT_TIMESTAMP  OR coupons.valid_until IS null) GROUP BY coupons.id',
        {type: Sequelize.QueryTypes.SELECT},
        {model: Coupon}
    )
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
 */ // TODO lasciare richiamando la funzione in coupon-token
exports.buyCoupon = function (req, res) {
    let coupon = req.body;

    // Controllare se non è scaduto
    // Controllare che non ne abbia già comprati altri

    // CouponToken.findOne({
    //     where: {
    //         id: couponID
    //     }
    // })
    //     .then(bought => {
    //         if (bought[0] === 0) {
    //             return res.status(HttpStatus.OK).json({
    //                 buy: false,
    //                 coupon_id: couponID,
    //                 message: "Coupon don't exist!!!"
    //             })
    //         }
    //         else if (bought[0] === 1) {
    //             return res.status(HttpStatus.OK).json({
    //                 buy: true,
    //                 coupon_id: couponID,
    //                 message: "Coupon bought!!!"
    //
    //             })
    //         }
    //     })
    //     .catch(err => {
    //         console.log(err);
    //
    //         return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    //             updated: false,
    //             coupon_id: couponID,
    //             error: 'Cannot buy the coupon'
    //         })
    //     });


    Sequelize.query('SELECT id, purchasable, ' + // TODO FIX 
        'COUNT(*) AS quantity, COUNT(CASE WHEN consumer IS NOT NULL THEN 1 END) AS availables, ' +
        'COUNT(CASE WHEN consumer = :user_id THEN 1 END) AS buyed ' +
        'FROM coupons JOIN coupon_tokens ON coupons.id = coupon_tokens.coupon_id WHERE id = :coupon_id GROUP BY id' ,
        { replacements: { user_id: req.user.id, coupon_id: coupon.coupon_id },
            type: sequelize.QueryTypes.SELECT,
            model: Coupon })
        .then(infos => {
            return res.send(infos);
        })
        .catch(err => {
            console.log(err);
            return res.send(err);
        })



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
 */ // TODO adattare
exports.editCoupon = function (req, res) {
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
        token: data.token,
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
            if (couponUpdated[0] == 0) {
                return res.status(HttpStatus.OK).json({
                    updated: false,
                    coupon_id: data.id,
                    message: "This coupon don't exist"
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
                error: 'Cannot editCoupon the coupon'
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
 */ // TODO OK
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
                return res.status(HttpStatus.BAD_REQUEST).json({
                    deleted: false,
                    coupon: parseInt(req.body.id),
                    message: "This coupon doesn't exist or you doesn't own the coupon!"
                })
            } else {
                return res.status(HttpStatus.OK).json({
                    deleted: true,
                    coupon: parseInt(req.body.id),
                    message: "Coupon deleted!"
                })
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
 */ // TODO adattare: se si trova un token, viene assegnato al consumer che fa la chiamata
exports.importOfflineCoupon = function (req, res) {
    const data = req.body;

    Coupon.update({
        consumer: req.user.id,
        token: data.token,
        state: data.state,
    }, {
        where: {
            [Op.and]: [
                {token: data.token},
                {state: 3},
            ]
        }
    })
        .then(couponUpdated => {
            if (couponUpdated[0] === 0) {
                return res.status(HttpStatus.OK).json({
                    validate: false,
                    token: data.token,
                    error: 'Cannot import coupon'
                })
            }
            else if (couponUpdated[0] === 1) {

                {
                    return res.status(HttpStatus.OK).json({
                        validate: true,
                        token: data.token
                    })
                }
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
 */ // TODO adattare chiamando il couponToken
exports.redeemCoupon = function (req, res) {
    const data = req.body;

    Coupon.update({
        state: 2,
    }, {
        where: {
            [Op.and]: [
                {state: 1},
            ]
        }
    })
        .then(couponUpdated => {
            if (couponUpdated[0] === 0) {
                return res.status(HttpStatus.OK).json({
                    validate: false,
                    token: data.token,
                    error: 'Cannot import coupon'
                })
            }
            else if (couponUpdated[0] === 1) {

                {
                    return res.status(HttpStatus.OK).json({
                        validate: true,
                        token: data.token
                    })
                }
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

exports.addImage = function (req, res) {
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

function generateUniqueToken(title, password) { // Generates a 8-char unique token based on the coupon title and the user (hashed) passwpord

    const min = Math.ceil(1);
    const max = Math.floor(1000000);
    const total = Math.floor(Math.random() * (max - min)) + min;

    // console.log('total', total);

    let hash = crypto.createHash('sha256').update(title + password + total.toString()).digest('hex').substr(0, 8).toUpperCase();
    // console.log('COUPON HASH: ' + hash);

    return hash;
}

function isCouponExpired(coupon_id) {
    Coupon.findOne({
        attributes: ['valid_from', 'valid_until'],
        where: {id: coupon_id}
    })
        .then(coupon => {
            if (coupon) { // If coupon exists
                if (Date.now() >= coupon.get('valid_from') && coupon.get('valid_until') <= Date.now()) {
                    return false;
                }
            }

            return true; // Coupon not found == expired
        })
        .catch(err => {
            console.log(err);
            return true;
        })
}

function isCouponPurchasable(coupon_id, user_id, res) {
    // La query rende id, purchasable, quantity, buyed

    console.log(coupon_id + ' ' + user_id );

    Sequelize.query('SELECT id, purchasable, COUNT(*) AS quantity, COUNT(CASE WHEN consumer IS NOT NULL THEN 1 END) AS availables, ' +
        'COUNT(CASE WHEN consumer = :user_id THEN 1 END) AS buyed ' +
        'FROM coupons JOIN coupon_tokens ON coupons.id = coupon_tokens.coupon_id WHERE id = :coupon_id',
        { replacements: { user_id: user_id, coupon_id: coupon_id },
            type: sequelize.QueryTypes.SELECT,
            model: Coupon })
        .then(infos => {
            return res.send(infos);
        })
        .catch(err => {
            console.log(err);
            return res.send(err);
        })
}
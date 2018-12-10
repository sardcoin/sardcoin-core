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

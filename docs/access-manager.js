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

/**
 * @api {put} /users/editUser Update user
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

/**
 * @api {deleteUser} /users/deleteUser delete user
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
                "error": "Cannot delete the user"
            }
 *
 *
 * * * @apiErrorExample Error-Response:
 *     HTTP/1.1 500 Internal Server Error
 *         {
                "deleted": false,
                "user": "Girolandia"
                "error": "Cannot delete the user"
            }
 *
 */

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
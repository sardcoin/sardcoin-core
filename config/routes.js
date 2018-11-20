const joi = require('joi');
const expressJoi = require('express-joi-validator');
const multiparty = require('connect-multiparty');
const multipartyMiddleware = multiparty();
const fs = require('file-system');

const Schemas            = require('../schemas/coupons-schema');
const AccessManager      = require('../engine/access-manager');
const CouponManager      = require('../engine/coupon-manager');
const CouponTokenManager = require('../engine/coupon-token-manager');
const ErrorHandler       = require('../engine/error-handler');


module.exports = function (app, passport) {

    /* PATHs */
    let indexPath = "/";
    let amPath    = indexPath + 'users/';
    let cmPath    = indexPath + 'coupons/';
    let ctPath    = indexPath + 'couponToken/';

    /* AUTH */
    const requireAuth = passport.authenticate('jwt', {session: false});
    const admin     = '0';
    const producer  = '1';
    const consumer  = '2';
    const verifier  = '3';
    const broker    = '4';
    const all       = [admin, producer, consumer, broker, verifier];

    /****************** ACCESS MANAGER ********************/
    app.post('/login', AccessManager.basicLogin);
    /****************** CRUD USERS ************************/
    app.post(amPath   + 'create/', AccessManager.createUser);        // Create
    app.get(amPath    + 'getFromToken', requireAuth, AccessManager.roleAuthorization(all), AccessManager.getUserFromToken);     // Read by ID
    app.put(amPath    + 'update/', requireAuth, AccessManager.roleAuthorization(all), AccessManager.updateUser);        // Update
    app.delete(amPath + 'delete/', requireAuth, AccessManager.roleAuthorization([admin]), AccessManager.deleteUser);    // Delete
    app.get(amPath    + 'getProducerFromId/:producer_id', requireAuth, AccessManager.roleAuthorization(all), AccessManager.getProducerFromId);     // Read by ID

    /****************** CRUD COUPONS **********************/
    app.post(cmPath    + 'create/', expressJoi(Schemas.createCouponSchema, {abortEarly: false}), requireAuth, AccessManager.roleAuthorization([producer, admin]), CouponManager.createCoupon); // Create
    app.get(cmPath     + 'getById/:coupon_id', requireAuth, AccessManager.roleAuthorization([consumer, producer,admin]), CouponManager.getFromId); // Get a coupon by his ID
    app.get(cmPath     + 'getPurchasedCoupons/', requireAuth, AccessManager.roleAuthorization([consumer, admin]), CouponManager.getPurchasedCoupons);
    app.get(cmPath     + 'getProducerCoupons/', requireAuth, AccessManager.roleAuthorization([producer, admin]), CouponManager.getProducerCoupons);
    app.get(cmPath     + 'getAvailableCoupons/', requireAuth, AccessManager.roleAuthorization([consumer, admin, verifier]), CouponManager.getAvailableCoupons);
    app.get(cmPath     + 'getDistinctCreatedCoupons/', requireAuth, AccessManager.roleAuthorization([producer, admin]), CouponManager.getDistinctCreatedCoupons);
    app.put(cmPath     + 'update/', expressJoi(Schemas.updateCouponSchema), requireAuth, AccessManager.roleAuthorization([producer, admin]), CouponManager.update);
    app.delete(cmPath  + 'delete/', requireAuth, AccessManager.roleAuthorization([producer, admin]), CouponManager.delete);
    app.post(cmPath    + 'addImage/', multipartyMiddleware, CouponManager.addImage);
    app.post(cmPath    + 'buyCoupon/', requireAuth, AccessManager.roleAuthorization([consumer]), CouponManager.buyCoupon);
    app.put(cmPath     + 'importCoupon/', expressJoi(Schemas.validateCouponSchema), requireAuth, AccessManager.roleAuthorization([producer, consumer, admin]), CouponManager.importCoupon);
    app.put(cmPath     + 'verifierCoupon/', expressJoi(Schemas.verifierCouponSchema), requireAuth, AccessManager.roleAuthorization([verifier, admin]), CouponManager.verifierCoupon);
    app.get(cmPath     + 'getAllCouponsStateOne/', requireAuth, AccessManager.roleAuthorization([verifier, admin]), CouponManager.getAllCouponsStateOne);

    /****************** CRUD COUPON TOKEN *****************/
    app.put(ctPath + 'update/', requireAuth, AccessManager.roleAuthorization([consumer, producer, verifier]), CouponTokenManager.updateCouponToken);
    app.post(ctPath + 'create/', requireAuth, AccessManager.roleAuthorization(all), CouponTokenManager.insertCouponToken);

    /****************** ERROR HANDLER *********************/
    // app.use(ErrorHandler.validationError);
    // app.use(ErrorHandler.fun404);


    app.use(function (err, req, res, next) {
        if (err.isBoom) {

            return res.status(err.output.statusCode).json(
                {
                    "Status Code": err.output.payload.statusCode,
                    "Type error": err.output.payload.error,
                    "message":  err.data[0].context.label
                }
                );
        }
    });
};
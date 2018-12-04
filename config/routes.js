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
    app.put(amPath    + 'editCoupon/', requireAuth, AccessManager.roleAuthorization(all), AccessManager.updateUser);        // Update
    app.delete(amPath + 'deleteCoupon/', requireAuth, AccessManager.roleAuthorization([admin]), AccessManager.deleteUser);    // Delete
    app.get(amPath    + 'getProducerFromId/:producer_id', requireAuth, AccessManager.roleAuthorization(all), AccessManager.getProducerFromId);     // Read by ID

    /****************** CRUD COUPONS **********************/
    app.post(cmPath    + 'create/', expressJoi(Schemas.createCouponSchema), requireAuth, AccessManager.roleAuthorization([producer, admin]), CouponManager.createCoupon); // Create
    app.get(cmPath     + 'getById/:coupon_id', requireAuth, AccessManager.roleAuthorization([consumer, producer,admin]), CouponManager.getFromId); // Get a coupon by his ID
    app.get(cmPath     + 'getPurchasedCoupons/', requireAuth, AccessManager.roleAuthorization([consumer, admin]), CouponManager.getPurchasedCoupons);
    app.get(cmPath     + 'getProducerCoupons/', requireAuth, AccessManager.roleAuthorization([producer, admin]), CouponManager.getProducerCoupons);
    app.get(cmPath     + 'getAvailableCoupons/', requireAuth, AccessManager.roleAuthorization([consumer, admin, verifier]), CouponManager.getAvailableCoupons);
    app.put(cmPath     + 'editCoupon/', expressJoi(Schemas.updateCouponSchema), requireAuth, AccessManager.roleAuthorization([producer, admin]), CouponManager.editCoupon);
    app.delete(cmPath  + 'deleteCoupon/', requireAuth, AccessManager.roleAuthorization([producer, admin]), CouponManager.deleteCoupon);
    app.post(cmPath    + 'addImage/', multipartyMiddleware, requireAuth, AccessManager.roleAuthorization([producer, admin]), CouponManager.addImage);
    app.post(cmPath    + 'buyCoupon/', requireAuth, AccessManager.roleAuthorization([consumer]), CouponManager.buyCoupon);
    app.put(cmPath     + 'importOfflineCoupon/', expressJoi(Schemas.validateCouponSchema), requireAuth, AccessManager.roleAuthorization([consumer]), CouponManager.importOfflineCoupon);
    app.put(cmPath     + 'redeemCoupon/', requireAuth, AccessManager.roleAuthorization([verifier, admin]), CouponManager.redeemCoupon);

    /****************** CRUD COUPON TOKEN *****************/

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
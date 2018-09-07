const joi = require('joi');
const expressJoi = require('express-joi-validator');

const multiparty = require('connect-multiparty');
const multipartyMiddleware = multiparty();
const fs = require('file-system');

const Schemas           = require('../schemas/coupons-schema');
const AccessManager     = require('../engine/access-manager');
const CouponManager     = require('../engine/coupon-manager');
const ErrorHandler      = require('../engine/error-handler');


module.exports = function (app, passport) {

    /* PATHs */
    let indexPath = "/";
    let amPath    = indexPath + 'users/';
    let cmPath    = indexPath + 'coupons/';

    /* AUTH */
    const requireAuth = passport.authenticate('jwt', {session: false});
    const admin     = '0';
    const producer  = '1';
    const consumer  = '2';
    const broker    = '3';
    const verifier  = '4';
    const all       = [admin, producer, consumer, broker, verifier];

    /****************** ACCESS MANAGER ********************/
    app.post('/login', AccessManager.basicLogin);

    /****************** CRUD USERS ************************/
    app.post(amPath   + 'create/', AccessManager.createUser);        // Create
    app.get(amPath    + 'getFromId', requireAuth, AccessManager.roleAuthorization(all), AccessManager.getUserById);     // Read by ID
    app.put(amPath    + 'update/', requireAuth, AccessManager.roleAuthorization(all), AccessManager.updateUser);        // Update
    app.delete(amPath + 'delete/', requireAuth, AccessManager.roleAuthorization([admin]), AccessManager.deleteUser);    // Delete

    /****************** CRUD COUPONS **********************/
    app.post(cmPath    + 'create/', expressJoi(Schemas.createCouponSchema), requireAuth, AccessManager.roleAuthorization([producer, admin]), CouponManager.createCoupon); // Create
    app.get(cmPath     + 'getById/:coupon_id', requireAuth, AccessManager.roleAuthorization([consumer, producer, admin]), CouponManager.getFromId); // Get a coupon by his ID
    app.get(cmPath     + 'getPurchasedCoupons/', requireAuth, AccessManager.roleAuthorization([consumer, admin]), CouponManager.getPurchasedCoupons);
    app.get(cmPath     + 'getCreatedCoupons/', requireAuth, AccessManager.roleAuthorization([producer, admin]), CouponManager.getCreatedCoupons);
    app.get(cmPath     + 'getAffordables/', requireAuth, AccessManager.roleAuthorization([consumer, admin]), CouponManager.getAffordables);
    app.put(cmPath     + 'update/', expressJoi(Schemas.updateCouponSchema), requireAuth, AccessManager.roleAuthorization([producer, admin]), CouponManager.update);
    app.delete(cmPath  + 'delete/', requireAuth, AccessManager.roleAuthorization([producer, admin]), CouponManager.delete);
    app.post(cmPath    + 'addImage/', multipartyMiddleware, CouponManager.addImage);
    app.post(cmPath    + 'buyCoupon/', requireAuth, AccessManager.roleAuthorization([consumer]), CouponManager.buyCoupon);

    /****************** ERROR HANDLER *********************/
    // app.use(ErrorHandler.validationError);
    // app.use(ErrorHandler.fun404);
};
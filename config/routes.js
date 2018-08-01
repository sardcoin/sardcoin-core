const joi = require('joi');
const expressJoi = require('express-joi-validator');

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
    const admin     = 'jwt-admin';
    const producer  = 'jwt-producer';
    const broker    = 'jwt-broker';
    const consumer  = 'jwt-consumer';
    const verifier  = 'jwt-verifier';
    const all       = ['jwt-admin', 'jwt-producer', 'jwt-broker', 'jwt-consumer', 'jwt-verifier'];

    /****************** ACCESS MANAGER ********************/
    app.post('/login', AccessManager.basicLogin);

    /****************** CRUD USERS ************************/
    app.post(amPath   + 'create/', AccessManager.createUser);        // Create
    app.get(amPath    + 'getFromId', auth(all), AccessManager.getUserById);     // Read by ID
    app.put(amPath    + 'update/', auth(all), AccessManager.updateUser);        // Update
    app.delete(amPath + 'delete/', auth([admin]), AccessManager.deleteUser);        // Delete

    /****************** CRUD COUPONS **********************/
    app.post(cmPath    + 'create/', expressJoi(Schemas.createCouponSchema), auth([admin, producer]), CouponManager.createCoupon); // Create
    app.get(cmPath     + 'getById/:coupon_id', auth(all), CouponManager.getFromId); // Get a coupon by his ID
    app.get(cmPath     + 'getAllByUser/', auth(all), CouponManager.getAllByUser);
    app.put(cmPath     + 'update/', expressJoi(Schemas.updateCouponSchema), auth([admin, producer]), CouponManager.update);
    app.delete(cmPath  + 'delete/', auth([admin, producer]), CouponManager.delete);

    /****************** ERROR HANDLER *********************/
    // app.use(ErrorHandler.validationError);
    // app.use(ErrorHandler.fun404);

    function auth(strategies) {
        return passport.authenticate.bind(passport)(strategies,  {session: false});
    }
};
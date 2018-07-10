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
    const adminAuth    = passport.authenticate.bind(passport)('jwt-admin',    {session: false});
    const producerAuth = passport.authenticate.bind(passport)('jwt-producer', {session: false});
    const brokerAuth   = passport.authenticate.bind(passport)('jwt-broker',   {session: false});
    const consumerAuth = passport.authenticate.bind(passport)('jwt-consumer', {session: false});
    const verifierAuth = passport.authenticate.bind(passport)('jwt-verifier', {session: false});

    /****************** ACCESS MANAGER ********************/
    app.post('/login', AccessManager.basicLogin);



    /****************** CRUD USERS ************************/
    app.post(amPath   + 'create/', adminAuth, AccessManager.createUser);        // Create
    app.get(amPath    + 'getFromId/:id', adminAuth, AccessManager.getUserById); // Read by ID
    app.put(amPath    + 'update/', adminAuth, AccessManager.updateUser);        // Update
    app.delete(amPath + 'delete/', adminAuth, AccessManager.deleteUser);        // Delete

    app.get(amPath + 'getUserFromUsername/:usern', AccessManager.getUserFromUsername); // NOT USEFUL



    /****************** CRUD COUPONS **********************/
    app.post(cmPath   + 'create/', expressJoi(Schemas.createCouponSchema), CouponManager.createCoupon);



    /****************** ERROR HANDLER *********************/
    //pp.use(ErrorHandler.fun404);


    // error handler
    app.use(ErrorHandler.validationError);
    app.use(ErrorHandler.fun404)
};
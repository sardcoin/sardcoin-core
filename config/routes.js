const expressJoi = require('express-joi-validator');
const multiparty = require('connect-multiparty');
const multipartyMiddleware = multiparty();

const Schemas = require('../schemas/coupons-schema');
const AcM = require('../engine/access-manager');
const CouponManager = require('../engine/coupon-manager');
const OrderManager = require('../engine/orders-manager');
const PaypalManager = require('../engine/paypal-manager');
const CategoriesManager = require('../engine/categories-manager');

module.exports = function (app, passport, config) {

    /* PATHs */
    const indexPath = "/";
    const amPath    = indexPath + 'users/';
    const cmPath    = indexPath + 'coupons/';
    const ordPath   = indexPath + 'orders/';
    const payPath   = indexPath + 'paypal/';
    const catPath   = indexPath + 'cat/';

    /* AUTH */
    const reqAuth = passport.authenticate('jwt', {session: false});
    const admin = '0';
    const producer = '1';
    const consumer = '2';
    const verifier = '3';
    const broker = '4';
    const all = [admin, producer, consumer, broker, verifier];

    /****************** ACCESS MANAGER ********************/
    app.post('/login', AcM.basicLogin);

    /****************** USERS ************************/
    app.post(amPath   + 'create/', AcM.createUser);
    app.get(amPath    + 'getFromToken/', reqAuth, AcM.roleAuth(all), AcM.getUserFromToken);
    app.put(amPath    + 'update/', reqAuth, AcM.roleAuth(all), AcM.updateUser);
    app.delete(amPath + 'delete/', reqAuth, AcM.roleAuth([admin]), AcM.deleteUser);
    app.get(amPath    + 'getProducerFromId/:producer_id', reqAuth, AcM.roleAuth(all), AcM.getProducerFromId);
    app.get(amPath    + 'getBrokers/', reqAuth, AcM.roleAuth(all), AcM.getBrokers);

    /****************** COUPONS **********************/
    app.post(cmPath   + 'create/', expressJoi(Schemas.createCouponSchema), reqAuth, AcM.roleAuth([producer, admin]), CouponManager.createCoupon);
    app.get(cmPath    + 'getById/:coupon_id', reqAuth, AcM.roleAuth([consumer, producer, admin]), CouponManager.getFromId);
    app.get(cmPath    + 'getPurchasedCoupons', reqAuth, AcM.roleAuth([consumer, admin]), CouponManager.getPurchasedCoupons);
    app.get(cmPath    + 'getPurchasedCouponsById/:coupon_id', reqAuth, AcM.roleAuth([consumer, admin]), CouponManager.getPurchasedCouponsById);
    app.get(cmPath    + 'getProducerCoupons/', reqAuth, AcM.roleAuth([producer, admin]), CouponManager.getProducerCoupons);
    app.get(cmPath    + 'getAvailableCoupons/', reqAuth, AcM.roleAuth([consumer, admin, verifier]), CouponManager.getAvailableCoupons);
    app.put(cmPath    + 'editCoupon/', expressJoi(Schemas.updateCouponSchema), reqAuth, AcM.roleAuth([producer, admin]), CouponManager.editCoupon);
    app.delete(cmPath + 'deleteCoupon/', reqAuth, AcM.roleAuth([producer, admin]), CouponManager.deleteCoupon);
    app.post(cmPath   + 'addImage/', multipartyMiddleware, reqAuth, AcM.roleAuth([producer, admin]), CouponManager.addImage);
    app.put(cmPath    + 'buyCoupons/', reqAuth, AcM.roleAuth([consumer]), CouponManager.buyCoupons);
    app.put(cmPath    + 'importOfflineCoupon/', expressJoi(Schemas.validateCouponSchema), reqAuth, AcM.roleAuth([consumer]), CouponManager.importOfflineCoupon);
    app.put(cmPath    + 'redeemCoupon/', reqAuth, AcM.roleAuth([verifier, producer, admin]), CouponManager.redeemCoupon);

    /****************** ORDERS *****************/
    app.get(ordPath + 'getOrdersByConsumer/', reqAuth, AcM.roleAuth([consumer, admin]), OrderManager.getOrdersByConsumer);
    app.get(ordPath + 'getOrderById/:order_id', reqAuth, AcM.roleAuth([consumer, admin]), OrderManager.getOrderById);

    /****************** PAYPAL PAYMENTS *****************/
    app.post(payPath + 'setCheckout', reqAuth, AcM.roleAuth(all), PaypalManager.setCheckout(config));
    app.get(payPath + 'confirm', PaypalManager.confirm(config));
    app.post(payPath + 'pay', reqAuth, AcM.roleAuth(all), PaypalManager.pay(config));

    /****************** CATEGORIES *****************/
    app.post(catPath + 'insert', reqAuth, AcM.roleAuth([admin]), CategoriesManager.insert);
    app.get(catPath + 'getAll', reqAuth, AcM.roleAuth([admin]), CategoriesManager.getAll);
    app.put(catPath + 'update', reqAuth, AcM.roleAuth([admin]), CategoriesManager.update);
    app.delete(catPath + 'delete', reqAuth, AcM.roleAuth([admin]), CategoriesManager.remove);

    /****************** ERROR HANDLER *********************/
    // app.use(ErrorHandler.validationError);
    // app.use(ErrorHandler.fun404);


    app.use(function (err, req, res, next) {
        if (err.isBoom) {
            return res.status(err.output.statusCode).json({
                "Status Code": err.output.payload.statusCode,
                "Type error": err.output.payload.error,
                "message": err.data[0].context.label
            });
        }
    });
};

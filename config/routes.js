const expressJoi = require('express-joi-validator');
const multiparty = require('connect-multiparty');
const multipartyMiddleware = multiparty();

const Schemas = require('../schemas/coupons-schema');
const PackageManager = require('../engine/package-manager');

const AcM = require('../engine/access-manager');
const CouponManager = require('../engine/coupon-manager');
const OrderManager = require('../engine/orders-manager');
const PaypalManager = require('../engine/paypal-manager');
const CatManager = require('../engine/categories-manager');
const ReportManager = require('../engine/report-manager');

module.exports = function (app, passport, config) {

    /* PATHs */
    const indexPath = "/";
    const amPath    = indexPath + 'users/';
    const cmPath    = indexPath + 'coupons/';
    const ordPath   = indexPath + 'orders/';
    const payPath   = indexPath + 'paypal/';
    const catPath   = indexPath + 'categories/';
    const pkPath    = indexPath + 'packages/';
    const rpPath    = indexPath + 'reports/';

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
    app.get(amPath    + 'getProducerFromId/:producer_id', AcM.getProducerFromId);
    app.get(amPath    + 'getBrokers/', reqAuth, AcM.roleAuth(all), AcM.getBrokers);

    /****************** COUPONS **********************/
    // Open methods
    app.get(cmPath    + 'getById/:coupon_id', CouponManager.getFromId);
    app.get(cmPath    + 'getById/:coupon_id', CouponManager.getFromId); //  reqAuth, AcM.roleAuth([consumer, admin, verifier]),
    app.get(cmPath    + 'getAvailableCoupons/', CouponManager.getAvailableCoupons);
    app.get(cmPath    + 'getAvailableByCatId/:category_id', CouponManager.getAvailableCouponsByCategory);
    app.get(cmPath    + 'getAvailableByTextAndCatId/:text/:category_id', CouponManager.getAvailableByTextAndCatId);

    // Private methods for user type
    // Consumer
    app.get(cmPath    + 'getByToken/:token/:type', reqAuth, AcM.roleAuth([consumer, admin]), CouponManager.getByToken);
    app.get(cmPath    + 'getPurchasedCoupons', reqAuth, AcM.roleAuth([consumer, admin]), CouponManager.getPurchasedCoupons);
    app.get(cmPath    + 'getPurchasedCouponsById/:coupon_id', reqAuth, AcM.roleAuth([consumer, admin]), CouponManager.getPurchasedCouponsById);
    app.put(cmPath    + 'buyCoupons/', reqAuth, AcM.roleAuth([consumer]), CouponManager.buyCoupons);
    app.put(cmPath    + 'importOfflineCoupon/', expressJoi(Schemas.validateCouponSchema), reqAuth, AcM.roleAuth([consumer]), CouponManager.importOfflineCoupon);
    app.get(cmPath    + 'isCouponRedeemed/', reqAuth, AcM.roleAuth([consumer, admin]), CouponManager.redeemCoupon);

    // Producer + broker
    app.post(cmPath   + 'create/', reqAuth, AcM.roleAuth([producer, broker, admin]), CouponManager.createCoupon); // TODO add again expressJoi(Schemas.createCouponSchema)
    app.get(cmPath    + 'getProducerCoupons/', reqAuth, AcM.roleAuth([producer, admin]), CouponManager.getProducerCoupons);
    app.get(cmPath    + 'getBrokerCoupons/', reqAuth, AcM.roleAuth([broker, admin]), CouponManager.getBrokerCoupons);
    app.put(cmPath    + 'editCoupon/', expressJoi(Schemas.updateCouponSchema), reqAuth, AcM.roleAuth([producer,broker, admin]), CouponManager.editCoupon);
    app.delete(cmPath + 'deleteCoupon/', reqAuth, AcM.roleAuth([producer, broker, admin]), CouponManager.deleteCoupon);
    app.post(cmPath   + 'addImage/', multipartyMiddleware, reqAuth, AcM.roleAuth([producer, broker, admin]), CouponManager.addImage);
    app.put(cmPath    + 'redeemCoupon/', reqAuth, AcM.roleAuth([verifier, producer, admin]), CouponManager.redeemCoupon);

    /****************** PACKAGE **********************/
    app.get(pkPath    + 'getBrokerPackages/', reqAuth, AcM.roleAuth([broker, admin]), PackageManager.getBrokerPackages);
    app.get(pkPath    + 'getCouponsPackage/:package_id', PackageManager.getCouponsPackage);

    /****************** ORDERS *****************/
    app.get(ordPath + 'getOrdersByConsumer/', reqAuth, AcM.roleAuth([consumer, admin]), OrderManager.getOrdersByConsumer);
    app.get(ordPath + 'getOrderById/:order_id', reqAuth, AcM.roleAuth([consumer, admin]), OrderManager.getOrderById);
    app.get(ordPath + 'getLastOrder/', reqAuth, AcM.roleAuth([consumer, admin]), OrderManager.getLastOrder);

    /****************** PAYPAL PAYMENTS *****************/
    app.post(payPath + 'setCheckout', reqAuth, AcM.roleAuth(all), PaypalManager.setCheckout(config));
    app.get(payPath + 'confirm', PaypalManager.confirm(config));
    app.post(payPath + 'pay', reqAuth, AcM.roleAuth(all), PaypalManager.pay(config));

    /****************** CATEGORIES *****************/
    app.get(catPath + 'getAll', CatManager.getAll); // reqAuth, AcM.roleAuth([admin, consumer]),

    app.put(catPath + 'update', reqAuth, AcM.roleAuth([admin]), CatManager.update);
    app.post(catPath + 'insert', reqAuth, AcM.roleAuth([admin]), CatManager.insert);
    app.delete(catPath + 'delete', reqAuth, AcM.roleAuth([admin]), CatManager.remove);
    app.post(catPath + 'assignCategoryToCoupon', reqAuth, AcM.roleAuth([admin, producer, broker]), CatManager.assignCategory);
    app.delete(catPath + 'removeCouponCategory', reqAuth, AcM.roleAuth([admin, producer, broker]), CatManager.removeCategory);

    /****************** REPORTS *****************/
    app.get(rpPath + 'getReportProducerCoupons/', reqAuth, AcM.roleAuth([producer, admin]), ReportManager.getReportProducerCoupons);
    app.get(rpPath + 'getReportProducerCouponFromId/:id', reqAuth, AcM.roleAuth([producer, admin]), ReportManager.getReportProducerCouponFromId);
    app.get(rpPath + 'getReportBrokerProducerCoupons/', reqAuth, AcM.roleAuth([producer, admin]), ReportManager.getReportBrokerProducerCoupons);
    app.get(rpPath + 'getReportBrokerProducerCouponFromId/:id', reqAuth, AcM.roleAuth([producer, admin]), ReportManager.getReportBrokerProducerCouponFromId);

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

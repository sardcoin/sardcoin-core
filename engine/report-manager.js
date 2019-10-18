'use strict';
const Sequelize = require('../models/index').sequelize;
const Coupon = require('../models/index').Coupon;
const CouponToken = require('../models/index').CouponToken;
const CouponBroker = require('../models/index').CouponBroker;
const Op = require('../models/index').Sequelize.Op;
const Package_id = require('../models/index').Package_id;
const CouponTokenManager = require('./coupon-token-manager');
const PackageManager = require('../engine/package-manager');
const HttpStatus = require('http-status-codes');

// get total coupons to user with generated,active,buyed,verified
const getReportProducerCoupons = (req, res) => {
    Sequelize.query(
        "SELECT id, title, description, EXTRACT(YEAR FROM timestamp) AS year, EXTRACT(month FROM timestamp) AS month, " +
        "EXTRACT(day FROM timestamp) AS day,timestamp," +
        'COUNT(CASE WHEN consumer IS NOT null AND verifier IS null THEN 1 END) AS bougth, ' +
        'COUNT(CASE WHEN consumer IS  null AND' +
        ' (coupons.visible_from <= CURRENT_TIMESTAMP OR coupons.visible_from IS null)  AND ' +
        '(coupons.valid_from <= CURRENT_TIMESTAMP OR coupons.valid_from IS null) AND ' +
        '(coupons.valid_until > CURRENT_TIMESTAMP OR coupons.valid_until IS null) AND ' +
        'verifier IS null THEN 1 END) AS active, ' +

        'COUNT(CASE WHEN consumer IS  null AND' +
        '(coupons.valid_until < CURRENT_TIMESTAMP) AND ' +
        'verifier IS null THEN 1 END) AS expired, ' +

        'COUNT(CASE WHEN consumer IS NOT null AND verifier IS not null THEN 1 END) AS verify, ' +
        'COUNT(*) AS generated ' +

        'FROM coupons JOIN coupon_tokens ON coupons.id = coupon_tokens.coupon_id WHERE owner = $1 ' +
        'GROUP BY id',
        {bind: [req.user.id], type: Sequelize.QueryTypes.SELECT},
        {model: Coupon})
        .then(coupons => {
            console.log('cpr', coupons)
            if (coupons.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send(null);
            }
            return res.status(HttpStatus.OK).send(coupons);
        })
        .catch(err => {
            console.log('cpr', err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the distinct coupons report'
            })
        })
};

// get single coupon to user form id with generated,active,buyed,verified (unused, no testing)
const getReportProducerCouponFromId = (req, res) => {
    Sequelize.query(
        'SELECT id, title, description, timestamp,' +
        'COUNT(CASE WHEN consumer IS NOT null AND verifier IS null THEN 1 END) AS buyed, ' +
        'COUNT(CASE WHEN consumer IS  null AND' +
        ' coupons.visible_from <= CURRENT_TIMESTAMP  AND coupons.valid_from <= CURRENT_TIMESTAMP AND ' +
        'verifier IS null THEN 1 END) AS active, ' +
        'COUNT(CASE WHEN consumer IS NOT null AND verifier IS not null THEN 1 END) AS verify, ' +
        'COUNT(*) AS generated ' +
        'FROM coupons JOIN coupon_tokens ON coupons.id = coupon_tokens.coupon_id WHERE id = $1 ' +
        'GROUP BY id',
        {bind: [req.params.id], type: Sequelize.QueryTypes.SELECT},
        {model: Coupon})
        .then(coupons => {
            if (coupons.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send(null);
            }
            return res.status(HttpStatus.OK).send(coupons);
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the coupon report'
            })
        })
};

// get total coupons to user with broker associated

const getReportBrokerProducerCoupons = (req, res) => {
    Sequelize.query(
        'select * , ROUND(SUM(result.totalPrice),2) as receipt from ('+
        'SELECT  COUNT(*) AS \'buyed\' ,ROUND(SUM(coupons.price),2) as \'totalPrice\' , coupons.id, ' +
        'EXTRACT(YEAR FROM coupons.timestamp) AS year, EXTRACT(month FROM coupons.timestamp) AS month, EXTRACT(day FROM coupons.timestamp) AS day, ' +
        'coupons.title, coupons.price ,coupons.description, coupons.timestamp, users.id AS uid, users.username\n' +
        'FROM `coupons`as coupons JOIN coupon_tokens ON coupons.id = coupon_tokens.coupon_id AND coupon_tokens.consumer is not null\n' +
        'Left JOIN package_tokens ON coupon_tokens.package = package_tokens.token left JOIN\n' +
        'coupons AS coupons1 ON package_tokens.package_id = coupons1.id left JOIN users ON coupons1.owner = users.id WHERE coupons.owner = $1\n' +
        ' GROUP BY coupons.id, users.id) as result group by result.uid ',
        {bind: [req.user.id], type: Sequelize.QueryTypes.SELECT},
        {model: Coupon})
        .then(coupons => {
            if (coupons.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send(null);
            }
            return res.status(HttpStatus.OK).send(coupons);
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the distinct coupons report with broker'
            })
        })
};

// get single coupon from id with broker associated (unused, no testing)

const getReportBrokerProducerCouponFromId = (req, res) => {
    Sequelize.query(
        'SELECT  COUNT(*) AS \'generated\' ,ROUND(SUM(coupons.price),2) as \'totalPrice\' , coupons.id, coupons.title, coupons.price ,coupons.description, timestamp, users.id AS uid, users.username\n' +
        'FROM `coupons`as coupons JOIN coupon_tokens ON coupons.id = coupon_tokens.coupon_id\n' +
        'Left JOIN package_tokens ON coupon_tokens.package = package_tokens.token left JOIN\n' +
        'coupons AS coupons1 ON package_tokens.package_id = coupons1.id left JOIN users ON coupons1.owner = users.id WHERE coupons.id = $1\n' +
        ' GROUP BY users.id',
        {bind: [req.id], type: Sequelize.QueryTypes.SELECT},
        {model: Coupon})
        .then(coupons => {
            if (coupons.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send(null);
            }
            return res.status(HttpStatus.OK).send(coupons);
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the coupon report with broker'
            })
        })
};
// get broker from id coupon
const getBrokerFromCouponId = (req, res) => {
    console.log('reqqqqqqqqqq', req)
    Sequelize.query(
        'SELECT username, coupon_broker.coupon_id FROM `users` JOIN coupon_broker ' +
        'ON coupon_broker.broker_id = users.id  WHERE coupon_broker.coupon_id =  $1',
        {bind: [req.params.coupon_id], type: Sequelize.QueryTypes.SELECT},
        {model: Coupon})
        .then(broker => {
            if (broker.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send(null);
            }
            console.log('broker', broker)
            return res.status(HttpStatus.OK).send(broker[0]);
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the coupon report with broker'
            })
        })
};

// get coupons bought to user
const getReportBoughtProducerCoupons = (req, res) => {
    Sequelize.query(
        'select COUNT(*) as bought, coupon_id, package, timestamp, price, ' +
        'EXTRACT(YEAR FROM coupons.timestamp) AS year, ' +
        'EXTRACT(month FROM coupons.timestamp) AS month, ' +
        'EXTRACT(day FROM coupons.timestamp) AS day ' +
        'FROM coupon_tokens JOIN coupons ON coupons.id = coupon_tokens.coupon_id ' +
        'WHERE consumer IS not null and coupons.owner = $1 GROUP BY id',
        {bind: [req.user.id], type: Sequelize.QueryTypes.SELECT},
        {model: Coupon})
        .then(coupons => {
            if (coupons.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send(null);
            }
            console.log('couponsBought', coupons)
            return res.status(HttpStatus.OK).send(coupons);
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the distinct coupons report'
            })
        })
};

module.exports = {
    getReportProducerCoupons,
    getReportProducerCouponFromId,
    getReportBoughtProducerCoupons,
    getReportBrokerProducerCouponFromId,
    getBrokerFromCouponId
}

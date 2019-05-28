'use strict';

const CouponToken = require('../models/index').CouponToken;
const Op = require('../models/index').Sequelize.Op;
const Package_tokens = require('../models/index').Package_tokens;

exports.insertCouponToken = async function (coupon_id, token) {

    return new Promise((resolve, reject) => {
        CouponToken.create({
            token: token,
            coupon_id: coupon_id,
            consumer: null,
            package:null,
            verifier: null
        })
            .then(newCoupon => {
                resolve(newCoupon !== null);
            })
            .catch(err => {
                console.log("The coupon token cannot be created.");
                console.log(err);

                reject(err);
            })
    });
};

exports.insertPackageToken = async function (coupon_id, token, tokenPackage) {

    return new Promise((resolve, reject) => {
        CouponToken.update({
            token: token,
            coupon_id: coupon_id,
            consumer: null,
            package:tokenPackage,
            verifier: null
        })
            .then(newCoupon => {
                resolve(newCoupon !== null);
            })
            .catch(err => {
                console.log("The coupon token cannot be created.");
                console.log(err);

                reject(err);
            })
    });
};

exports.updateCouponToken = async function(token, coupon_id, consumer=null,pack=null, verifier=null){
    return new Promise((resolve, reject) => {
        CouponToken.update({
            consumer: consumer,
            verifier: verifier,
            package:pack
        }, {
            where: {
                [Op.and]: [
                    {token: token}, {coupon_id: coupon_id}
                ]
            }
        })
            .then(couponTokenUpdated => {
                console.log('couponTokenUpdated',couponTokenUpdated)
                const result = !(couponTokenUpdated[0] === 0); // If the update is fine, it returns true
                resolve(result);
            })
            .catch(err => {
                console.log("The coupon token cannot be updated.");
                console.log(err);

                reject(err);
            })
    });
};




exports.getTokenByIdCoupon = (coupon_id)=> {

    console.log('get tokens, coupon_id', coupon_id)

    return new Promise((resolve, reject) => {
        CouponToken.findOne({

                where: {consumer: null, coupon_id: coupon_id, package: null, verifier:null}

        })
            .then(newCouponToken => {
                resolve(newCouponToken);
            })
            .catch(err => {
                console.log("This coupon token don't available.");
                console.log(err);

                reject(err);
            })
    });
};

 exports.getCouponsByTokenPackage = async( token)=> {


    return new Promise( (resolve, reject) => {
        CouponToken.findAll({

            where: { package: token, verifier:null}

        })
            .then(couponsIntoPackage => {
                resolve(couponsIntoPackage);
            })
            .catch(err => {
                console.log("The coupons don't available.");
                console.log(err);

                reject(err);
            })
    });
};


exports.insertPackageToken = async function (coupon_id, token, tokenPackage) {

    return new Promise((resolve, reject) => {
        CouponToken.create({
            token: token,
            coupon_id: coupon_id,
            consumer: null,
            package:tokenPackage,
            verifier: null
        })
            .then(newCoupon => {
                resolve(newCoupon !== null);
            })
            .catch(err => {
                console.log("The coupon token cannot be created.");
                console.log(err);

                reject(err);
            })
    });
};

exports.getTokenByIdPackage = async function (token_id) {

    return new Promise((resolve, reject) => {
        Package_tokens.findAll({

            where: { package_id: token_id}

        })
            .then(tokenPackage => {
                resolve(tokenPackage);
            })
            .catch(err => {
                console.log("This package token don't available.");
                console.log(err);

                reject(err);
            })
    });
};

'use strict';

const Coupon = require('../models/index').Coupon;
const CouponToken = require('../models/index').CouponToken;
const User = require('../models/index').User;
const Sequelize = require('../models/index').sequelize;
const Op = require('../models/index').Sequelize.Op;
const HttpStatus = require('http-status-codes');
const fs = require('file-system');
const path = require('path');
const crypto = require('crypto');

exports.insertCouponToken = async function (coupon_id, token) {

    return new Promise((resolve, reject) => {
        CouponToken.create({
            token: token,
            coupon_id: coupon_id,
            consumer: null,
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

exports.updateCouponToken = async function(token, coupon_id, consumer=null, verifier=null){
    return new Promise((resolve, reject) => {
        CouponToken.update({
            consumer: consumer,
            verifier: verifier
        }, {
            where: {
                [Op.and]: [
                    {token: token}, {coupon_id: coupon_id}
                ]
            }
        })
            .then(couponTokenUpdated => {
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

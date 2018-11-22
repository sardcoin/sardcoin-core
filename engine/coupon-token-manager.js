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

// Private function: it takes the coupon_id and the token and create a new CouponToken
exports.insertCouponToken = function (coupon_id, token) {

    CouponToken.create({
        token: token,
        coupon_id: coupon_id,
        consumer: null,
        verifier: null
    })
        .then(newCoupon => {
            if(newCoupon) {
                return true;
            }
        })
        .catch(err => {
            console.log("The coupon token cannot be created.");
            console.log(err);

            return false;
        })

};

exports.updateCouponToken = async function(token, coupon_id, consumer=null, verifier=null){
    return new Promise((resolve) => {
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
                const result = !(couponTokenUpdated[0] === 0);
                resolve(result);
            })
            .catch(err => {
                console.log("The coupon token cannot be updated.");
                console.log(err);

                resolve(false);
            })
    });
};

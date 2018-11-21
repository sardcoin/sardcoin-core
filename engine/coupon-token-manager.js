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
exports.insertCouponToken = async function (coupon_id, token) {

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

// TODO Pensare in ottica acquisto e redeem (senza req/res)
exports.updateCouponToken = function (req, res) {
    const coupon_token = req.body;

    // Verifica se il coupon che si vuole modificare appartiene all'utente che sta facendo la chiamata
    CouponToken.findOne({
        include: [
            {
                model: Coupon, required: true,
                include: [{
                    model: User, required: true
                }],
                where: {
                    [Op.and]: [
                        {owner: req.user.id},
                        {id: coupon_token.coupon_id}
                    ]
                }
            },
        ],
    })
        .then(userCoupons => {
            if (userCoupons) { // Se viene reso un coupon, allora si può procedere alla modifica

                CouponToken.update({
                    consumer: coupon_token.consumer === '' ? null : coupon_token.consumer,
                    verifier: coupon_token.verifier === '' ? null : coupon_token.verifier
                }, {
                    where: {
                        token: coupon_token.token
                    }
                })
                    .then(couponUpdated => {
                        if (couponUpdated[0] === 0) {
                            return res.status(HttpStatus.BAD_REQUEST).json({
                                updated: false,
                                token: coupon_token.token,
                                message: "This coupon token doesn't exist or there is nothing to editCoupon."
                            })
                        }
                        else {
                            return res.status(HttpStatus.OK).json({
                                updated: true,
                                token: coupon_token.token
                            })
                        }
                    })
                    .catch(err => {
                        console.log(err);
                        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                            error: true,
                            message: 'An error occurred during the editCoupon of the coupon token.'
                        })
                    });
            } else {
                return res.status(HttpStatus.BAD_REQUEST).send({
                    error: true,
                    message: 'You cannot edit a coupon that you don\'t own or that doens\'t exist!'
                })
            }
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the coupons for the user'
            })
        })
};
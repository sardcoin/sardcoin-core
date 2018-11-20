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

function generateUniqueToken(title, password) { // Generates a 8-char unique token based on the coupon title and the user (hashed) passwpord

    const min = Math.ceil(1);
    const max = Math.floor(1000000);
    const total = Math.floor(Math.random() * (max - min)) + min;

    // console.log('total', total);

    let hash = crypto.createHash('sha256').update(title + password + total.toString()).digest('hex').substr(0, 8).toUpperCase();
    // console.log('COUPON HASH: ' + hash);

    return hash;
}

exports.insertCouponToken = function (req, res, next) {
    const coupon = req.body;

    Coupon.findOne({
        where: {
            [Op.and]: [
                {id: coupon.coupon_id},
                {owner: req.user.id}
            ]
        }
    })
        .then(couponFound => {
            if(couponFound) { // Se trova un coupon, allora quello è di proprietà dell'utente che fa la chiamata
                const token = generateUniqueToken(coupon.title, req.user.password);

                CouponToken.create({
                    token: token,
                    coupon_id: coupon.coupon_id,
                    state: coupon.state,
                    consumer: coupon.consumer === '' ? null : coupon.consumer
                })
                    .then(newCoupon => {
                        return res.status(HttpStatus.CREATED).send({
                            inserted: true,
                            token: token
                        });
                    })
                    .catch(err => {
                        console.log("The coupon token cannot be created.");
                        console.log(err);
                        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                            error: true,
                            message: 'The coupon token cannot be created.'
                        });
                    })

            } else {
                return res.status(HttpStatus.BAD_REQUEST).send({
                    error: true,
                    message: 'You cannot insert a coupon token of a token that you doesn\'t own!'
                })
            }
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'An error occurred inserting a new coupon token.'
            })
        })
};

exports.updateCouponToken = function (req, res, next) {
    const coupon_token = req.body;

    // Verifica se il coupon che si vuole modificare appartiene all'utente che sta facendo la chiamata
    CouponToken.findOne({
        include: [
            {
                model: Coupon, required: true,
                include: [{
                    model: User,
                    required: true

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
                    state: coupon_token.state,
                    consumer: coupon_token.consumer === '' ? null : coupon_token.consumer
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
                                message: "This coupon token doesn't exist or there is nothing to update."
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
                            message: 'An error occurred during the update of the coupon token.'
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
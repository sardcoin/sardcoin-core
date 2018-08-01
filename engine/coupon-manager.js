'use strict';

const Coupon = require('../models/index').Coupon;
const Op = require('../models/index').Sequelize.Op;
const HttpStatus = require('http-status-codes');

exports.createCoupon = function (req, res, next) {

    const data = req.body;

    Coupon.create({
        title: data.title,
        description: data.description,
        timestamp: Number(Date.now()),
        price: data.price,
        valid_from: Number(data.valid_from),
        valid_until: Number(data.valid_until),
        state: data.state,
        constraints: data.constraints,
        owner: data.owner,
        consumer: data.consumer
    })
        .then(newCoupon => {
            return res.send({
                created: true,
                title: newCoupon.get('title'),
                description: newCoupon.get('description')
            });
        })
        .catch(err => {
            console.log("The coupon cannot be created.");
            return res.send(err);
        })

};

exports.getFromId = function (req, res, next) {

    Coupon.findById(req.params.coupon_id)
        .then(coupon => {
            if (coupon === null) {
                return res.status(HttpStatus.OK).json({
                    error: 'No coupon found with the given id',
                    coupon_id: req.params.coupon_id
                })
            }

            return res.status(HttpStatus.OK).json(coupon)
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: err
            })
        });
};

exports.getAllByUser = function (req, res, next) {
    Coupon.findAll({
        where: {
            [Op.or]: [
                {owner: req.user.id},
                {consumer: req.user.id}
            ]
        }
    })
        .then(coupons => {
            return res.status(HttpStatus.OK).json(coupons)
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: err
            })
        });
};

exports.update = function (req, res, next) {
    const data = req.body;

    Coupon.update({
        title: data.title,
        description: data.description,
        price: data.price,
        valid_from: Number(data.valid_from),
        valid_until: Number(data.valid_until),
        state: data.state,
        constraints: data.constraints,
    }, {
        where: {
            [Op.and]: [
                {owner: req.user.id},
                {id: data.id}
            ]
        }
    })
        .then(couponUpdated => {
            return res.status(HttpStatus.OK).json({
                updated: true,
                coupon_id: data.id
            })
        })
        .catch(err => {
            console.log(err);

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                updated: false,
                coupon_id: data.id,
                error: 'Cannot update the coupon'
            })
        });
};

exports.delete = function (req, res, next) {
    Coupon.destroy({
        where: {
            [Op.and]: [
                { id: req.body.id },
                { owner: req.user.id }
            ]
        }
    })
        .then(() => {
            return res.status(HttpStatus.OK).json({
                deleted: true,
                coupon: parseInt(req.body.id)
            })
        })
        .catch(err => {
            console.log(err);

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                deleted: false,
                coupon: parseInt(req.body.id),
                error: 'Cannot delete the coupon'
            })
        })
};

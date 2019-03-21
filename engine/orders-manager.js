'use strict';

const Order = require('../models/index').Order;
const Coupon = require('../models/index').Coupon;
const OrderCoupon = require('../models/index').OrderCoupon;
const Op = require('../models/index').Sequelize.Op;

const HttpStatus = require('http-status-codes');

/** The consumer can obtain his orders history **/
const getOrdersByConsumer = async (req, res) => {
    let orders;

    try {
        orders = await Order.findAll({ where: {consumer: req.user.id}});

        return res.status(HttpStatus.OK).send(orders);
    } catch (e) {
        console.error(e);
        return res.send(HttpStatus.INTERNAL_SERVER_ERROR).send({
            message: 'Error on querying the orders made by the user'
        });
    }
};

/** The consumer can obtain his detailed order by the id of the order**/
const getOrderById = async (req, res) => {
    let aux, price, order = {
      id: req.params.order_id,
      consumer: req.user.id,
      OrderCoupon: []
    };

    try {
        aux = await Order.findAll({
                    include: [{model: OrderCoupon, required: true, attributes: {exclude: ['order_id']}}],
                    where: {[Op.and]: [{consumer: req.user.id},{id: req.params.order_id}]}
                });

        if(aux.length > 0) {
            for (const i in aux) {
                price = (await Coupon.findOne({where: {id: aux[i].dataValues.OrderCoupon.coupon_id}})).dataValues.price;

                order.OrderCoupon.push({
                    coupon_id: aux[i].dataValues.OrderCoupon.coupon_id,
                    quantity: aux[i].dataValues.OrderCoupon.quantity,
                    price: price
                })
            }

            return res.status(HttpStatus.OK).send(order);
        }

        return res.status(HttpStatus.NO_CONTENT).send({});
    } catch (e) {
        console.error(e);
        return res.send(HttpStatus.INTERNAL_SERVER_ERROR).send({
            message: 'Error on querying the orders made by the user'
        });
    }
};

module.exports = {getOrdersByConsumer, getOrderById};

'use strict';

const Order = require('../models/index').Order;
const OrderCoupon = require('../models/index').OrderCoupon;
const Sequelize = require('../models/index').sequelize;
const Op = require('../models/index').Sequelize.Op;

const HttpStatus = require('http-status-codes');

/** The consumer can obtain his orders history **/
const getOrdersByConsumer = async (req, res) => {
    let orders;

    try {
        orders = await Order.findAll({include: [{model: OrderCoupon, required: true}], where: {consumer: req.user.id}});

        return res.status(HttpStatus.OK).send(orders);
    } catch (e) {
        console.error(e);
        return res.send(HttpStatus.INTERNAL_SERVER_ERROR).send({
            message: 'Error on querying the orders made by the user'
        });
    }
};

module.exports = {getOrdersByConsumer};
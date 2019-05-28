'use strict';

const Order = require('../models/index').Order;
const Coupon = require('../models/index').Coupon;
const CouponToken = require('../models/index').CouponToken;
const OrderCoupon = require('../models/index').OrderCoupon;
const Op = require('../models/index').Sequelize.Op;

const HttpStatus = require('http-status-codes');

/** The consumer can obtain his orders history **/
const getOrdersByConsumer = async (req, res) => {
    let orders;

    try {
        orders = await Order.findAll({where: {consumer: req.user.id}, order: [['purchase_time', 'DESC']]});

        return res.status(HttpStatus.OK).send(orders);
    } catch (e) {
        console.error(e);
        return res.send(HttpStatus.INTERNAL_SERVER_ERROR).send({
            message: 'Error on querying the orders made by the user.'
        });
    }
};

/** The consumer can obtain his detailed order by the id of the order**/
const getOrderById = async (req, res) => {
    let aux, price, order = {
        id: req.params.order_id,
        consumer: req.user.id,
        purchase_time: '',
        OrderCoupon: []
    };

    try {
        aux = await Order.findAll({
            include: [{model: OrderCoupon, required: true, attributes: {exclude: ['order_id']}}],
            where: {[Op.and]: [{consumer: req.user.id}, {id: req.params.order_id}]}
        });

        if (aux.length > 0) {
            order.purchase_time = aux[0].dataValues.purchase_time;
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

const createOrderFromCart = async (user_id, coupon_list) => {
    let newOrder, newOrderCoupon, order_id;

    try {
        newOrder = await Order.create({consumer: user_id, purchase_time: (new Date()).getTime()});
        order_id = newOrder.dataValues.id;

        for (const i in coupon_list) {
            newOrderCoupon = await OrderCoupon.create({
                order_id: order_id,
                coupon_id: coupon_list[i].id,
                quantity: coupon_list[i].quantity
            });
        }
    } catch (e) {
        // The method creashed somewhere inserting entries on the database. For this reason, I delete every entry has been inserted
        if (order_id) {
            await OrderCoupon.destroy({where: {order_id: order_id}});
            await Order.destroy({where: {order_id: order_id}});
        }

        console.error(e);
        throw new Error('createOrderFromCart -> Error creating the order');
    }

    return order_id;
};

const revertOrder = async (order_id) => {
    let order, token, up, success = true;
    let consumer, coupon_id, j;

    try {
        order = await Order.findAll({
            include: [{model: OrderCoupon, required: true}],
            where: {id: order_id}
        });

        for (const i in order) {
            coupon_id = order[i].dataValues.OrderCoupon.dataValues.coupon_id;
            consumer = order[i].dataValues.consumer;
            j = 0;

            while(j < order[i].dataValues.OrderCoupon.dataValues.quantity) {
                token = await CouponToken.findOne({
                    where: {
                        coupon_id: coupon_id,
                        consumer: consumer,
                        verifier: {[Op.eq]: null}
                    }
                });

                if(token) {
                    up = await CouponToken.update({consumer: null}, {
                        where: {
                            coupon_id: coupon_id,
                            consumer: consumer,
                            verifier: {[Op.eq]: null},
                            token: token.dataValues.token
                        }
                    });
                } else {
                    console.warn('Something is not going good...');
                    console.warn('Query: SELECT * FROM couponToken WHERE coupon_id = ' + coupon_id + ' AND consumer = ' + consumer + ' AND verifier IS NULL');
                }

                j++;
            }

            await OrderCoupon.destroy({where: {
                    order_id: order_id,
                    coupon_id: coupon_id,
                    quantity: order[i].dataValues.OrderCoupon.dataValues.quantity
                }
            })
        }

        await Order.destroy({where: {
                ID: order[0].dataValues.id,
            }
        })

    } catch (e) {
        console.error(e);
        success = false;
    }

    return success;
};

module.exports = {createOrderFromCart, getOrdersByConsumer, getOrderById, revertOrder};

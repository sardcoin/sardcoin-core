'use strict';

const Order = require('../models/index').Order;
const Coupon = require('../models/index').Coupon;
const CouponToken = require('../models/index').CouponToken;
const PackageTokens = require('../models/index').PackageTokens;
const OrderCoupon = require('../models/index').OrderCoupon;
const Op = require('../models/index').Sequelize.Op;
const Sequelize = require('../models/index').sequelize;

const ITEM_TYPE = {
    COUPON: 0,
    PACKAGE: 1
};

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


const getLastOrder = async (req, res) => {

    Sequelize.query(
        'SELECT MAX(id) as lastId from orders',
        {bind: [req.user.id], type: Sequelize.QueryTypes.SELECT},
        {model: OrderCoupon}
        ).then((maxId) =>{


            console.log('max id', maxId)
            if (!maxId) {
                return res.status(HttpStatus.NO_CONTENT).send({});
            } else {
                return res.status(HttpStatus.OK).send(JSON.parse(JSON.stringify(maxId))[0]);

            }
    }).catch( err =>{
        console.log('error get last id',err);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'Cannot get last id order'
        })
    })

};
/** The consumer can obtain his detailed order by the id of the order**/
const getOrderById = async (req, res) => {
    let aux, price, coupon_id, order = {
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

            console.log(aux[0].dataValues.OrderCoupons);

            for (const coupon of aux[0].dataValues.OrderCoupons) {
                console.warn(coupon.dataValues);
                coupon_id = coupon.dataValues.coupon_token
                    ? (await CouponToken.findOne({where: {token: coupon.dataValues.coupon_token}})).dataValues.coupon_id
                    : (await PackageTokens.findOne({where: {token: coupon.dataValues.package_token}})).dataValues.package_id;

                price = (await Coupon.findOne({where: {id: coupon_id}}));

                order.OrderCoupon.push({
                    id: coupon.dataValues.id,
                    coupon_token: coupon.dataValues.coupon_token || null,
                    package_token: coupon.dataValues.package_token || null,
                    price: price.dataValues.price,
                    coupon_id: coupon_id
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

/**
 * coupon_list is defined as follow:
 * token: token of the coupon/package
 * type: it can be 0 (coupon) or 1 (package)
 **/
const createOrderFromCart = async (user_id, coupon_list) => {
    let newOrder, newOrderCoupon, order_id, coupon_token, package_token;

    try {
        newOrder = await Order.create({consumer: user_id, purchase_time: (new Date()).getTime()});
        order_id = newOrder.dataValues.id;

        // console.log(coupon_list);

        for (const coupon of coupon_list) {
            console.log('createOrderFromCart', coupon);
            package_token = coupon.type === ITEM_TYPE.PACKAGE ? coupon.token : null;
            coupon_token = coupon.type === ITEM_TYPE.COUPON ? coupon.token : null;

            newOrderCoupon = await OrderCoupon.create({
                order_id: order_id,
                coupon_token: coupon_token,
                package_token: package_token
            });
        }
    } catch (e) {
        // The method creashed somewhere inserting entries on the database. For this reason, I delete every entry has been inserted
        if (order_id) {
            await OrderCoupon.destroy({where: {order_id: order_id}});
            await Order.destroy({where: {id: order_id}});
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

            while (j < order[i].dataValues.OrderCoupon.dataValues.quantity) {
                token = await CouponToken.findOne({
                    where: {
                        coupon_id: coupon_id,
                        consumer: consumer,
                        verifier: {[Op.eq]: null}
                    }
                });

                if (token) {
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

            await OrderCoupon.destroy({
                where: {
                    order_id: order_id,
                    coupon_id: coupon_id,
                    quantity: order[i].dataValues.OrderCoupon.dataValues.quantity
                }
            })
        }

        await Order.destroy({
            where: {
                ID: order[0].dataValues.id,
            }
        })

    } catch (e) {
        console.error(e);
        success = false;
    }

    return success;
};

module.exports = {createOrderFromCart, getOrdersByConsumer, getOrderById, revertOrder, getLastOrder};

'use strict';

const CouponBroker = require('../models/index').CouponBroker;
const Op = require('../models/index').Sequelize.Op;

exports.insertCouponBroker = async function (coupon_id, broker_id) {

    return new Promise((resolve, reject) => {
        CouponBroker.create({
            coupon_id: coupon_id,
            broker_id: broker_id,
            quantita: null
        })
            .then(newBrokerCoupon => {
                resolve(newBrokerCoupon !== null);
            })
            .catch(err => {
                console.log("The coupon broken cannot be created.");
                console.log(err);

                reject(err);
            })
    });
};

exports.updateCouponBroken = async function(coupon_id, broker_id, quantita=null){
    return new Promise((resolve, reject) => {
        CouponBroker.update({
            coupon_id: coupon_id,
            broker_id: broker_id,
            quantita: quantita
        }, {
            where: {
                [Op.and]: [
                    {broker_id: broker_id}, {coupon_id: coupon_id}
                ]
            }
        })
            .then(couponBrokerUpdated => {
                const result = !(couponBrokerUpdated[0] === 0); // If the update is fine, it returns true
                resolve(result);
            })
            .catch(err => {
                console.log("The coupon broker cannot be updated.");
                console.log(err);

                reject(err);
            })
    });
};

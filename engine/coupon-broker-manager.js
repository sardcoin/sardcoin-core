'use strict';

const CouponBroker = require('../models/index').CouponBroker;
const Op = require('../models/index').Sequelize.Op;
const Sequelize = require('../models/index').sequelize;
const HttpStatus = require('http-status-codes');

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

// exports.getBrokersFromId = (req, res) => {
//         CouponBroker.findAll({
//             attributes: ['broker_id'],
//             where: {
//                 coupon_id: req.params.coupon_id
//             }
//         })
//             .then( brokers => {
//                 const result = brokers // If the update is fine, it returns true
//                 console.log('result', brokers)
//                 if (result.length === 0) {
//                     console.log("The coupon don't have broker associated. Array empty.");
//                     return res.status(HttpStatus.NO_CONTENT).send({
//                         error: 'No brokers found with the given id.',
//                         coupon_id: parseInt(req.params.coupon_id),
//                     })
//                 } else {
//                     return res.status(HttpStatus.OK).send(result)
//                 }
//             })
//             .catch(err => {
//                 console.log(" The coupon don't have broker associated.");
//                 console.log(err);
//
//                 reject(err);
//             })
// };


exports.removeAllCouponsBroker = async (req, res) => {
    let couponBrokerRemoved;
    //console.log('req removeAllCategory', req)
    try {
        couponBrokerRemoved = await CouponBroker.destroy({where: {coupon_id: req.coupon_id}});

        if (couponBrokerRemoved === 0) {
            return {
                error: true,
                message: 'The tuple broker-coupon to delete does not exist.'
            }
        }

        return {
            deleted: true,
            coupon_id: req.id,
        };
    } catch (e) {
        console.error(e);
        return {
            error: true,
            message: 'An error occurred while deleting the broker associated to the coupon'
        }
    }
};

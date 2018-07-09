'use strict';

const Coupon = require('../models/index').Coupon;

exports.createCoupon = function (req, res, next) {

    const data = req.body;

    console.log("DATA: " + new Date(Number(data.timestamp)));

    Coupon.create({
        title:          data.title,
        description:    data.description,
        timestamp:      Number(data.timestamp),
        price:          data.price,
        valid_from:     Number(data.valid_from),
        valid_until:    Number(data.valid_until),
        state:          data.state,
        constraints:    data.constraints,
        owner:          data.owner,
        consumer:       data.consumer
    })
        .then(newCoupon => {
                        res.send({
                            created:        true,
                            title:          newCoupon.get('title'),
                            description:    newCoupon.get('description')
                        });
                    })
        .catch(err => {
            console.log("The coupon cannot be created.");
            res.send(err);
        })

};
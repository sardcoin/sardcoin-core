'use strict';

const Coupon = require('../models/index').Coupon;

// TODO check correctness

exports.createCoupon = function (req, res, next) {

    const data = req.body;

    Coupon.create({
        title:          data.title,
        description:    data.description,
        timestamp:      data.timestamp,
        price:          data.price,
        valid_from:     data.valid_from,
        valid_until:    data.valid_until,
        state:          data.state,
        constraints:    data.constraints,
        owner:          data.owner,
        consumer:       data.consumer
    })
        .then(newUser => {
                        res.send({
                            created:    true,
                            first_name: newUser.get('first_name'),
                            last_name:  newUser.get('last_name')
                        });
                    })
        .catch(err => {
            console.log("User cannot be created");
            res.send(err);
        })

};
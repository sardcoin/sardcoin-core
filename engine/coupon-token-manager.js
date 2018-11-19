'use strict';

const Coupon      = require('../models/index').Coupon;
const CouponToken = require('../models/index').CouponToken;
const User      = require('../models/index').User;
const Sequelize   = require('../models/index').sequelize;
const Op          = require('../models/index').Sequelize.Op;
const HttpStatus  = require('http-status-codes');
const fs          = require('file-system');
const path        = require('path');
const crypto      = require('crypto');

function generateUniqueToken(title, password) { // Generates a 8-char unique token based on the coupon title and the user (hashed) passwpord

    const min = Math.ceil(1);
    const max = Math.floor(1000000);
    const total =  Math.floor(Math.random() * (max - min)) + min;

    // console.log('total', total);

    let hash = crypto.createHash('sha256').update(title + password + total.toString()).digest('hex').substr(0, 8).toUpperCase();
    // console.log('COUPON HASH: ' + hash);

    return hash;
}

// TODO decidere se riceve lo unique token oppure se lo genera lui
exports.insertCouponToken = function (req, res, next) {
  const coupon = req.body;

  // TODO Verificare prima che coupon_id appartenga all'utente che sta inserendo la riga, altrimenti errore

  CouponToken.insert({
      token: coupon.token,
      coupon_id: coupon.coupon_id,
      state: coupon.state,
      consumer: coupon.consumer
  })
      .then(newCoupon => {
          return res.status(HttpStatus.CREATED).send({
              inserted: true,
              token: coupon.token
          });
      })
      .catch(err => {
          console.log("The coupon token cannot be created.");
          console.log(err);
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
              error: true,
              message: 'The coupon cannot be created.'
          });
      })
};

exports.updateCouponToken = function (req, res, next) {

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
                        {id: req.params.cid}
                    ]
                }
            },
        ],

    })
        .then(userCoupons => {
            if(userCoupons) { // Se viene reso un coupon, allora si può procedere alla modifica

                return res.status(HttpStatus.OK).send(userCoupons);
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
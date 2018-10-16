'use strict';

const Coupon     = require('../models/index').Coupon;
const Sequelize  = require('../models/index').sequelize;
const Op         = require('../models/index').Sequelize.Op;
const HttpStatus = require('http-status-codes');
const fs = require('file-system');
const path = require('path');
const crypto = require('crypto');

function generateUniqueToken(title, password) { // Generates a 8-char unique token based on the coupon title and the user (hashed) passwpord

    const min = Math.ceil(1);
    const max = Math.floor(1000000);
    const total =  Math.floor(Math.random() * (max - min)) + min;

    // console.log('total', total);

    let hash = crypto.createHash('sha256').update(title + password + total.toString()).digest('hex').substr(0, 8).toUpperCase();
    // console.log('COUPON HASH: ' + hash);

    return hash;
}

exports.createCoupon = function (req, res, next) {

    const data = req.body;

    let valid_until = data.valid_until === null ? null : Number(data.valid_until);

    console.log(data.valid_until);

    Coupon.create({
        title: data.title,
        description: data.description,
        image: data.image,
        timestamp: Number(Date.now()),
        price: data.price,
        valid_from: Number(data.valid_from),
        valid_until: valid_until,
        state: data.state,
        constraints: data.constraints,
        owner: data.owner,
        consumer: data.consumer,
        quantity: data.quantity,
        token: generateUniqueToken(data.title, req.user.password),
    })
        .then(newCoupon => {
            return res.status(HttpStatus.CREATED).send({
                created: true,
                id: newCoupon.get('id'),
                title: newCoupon.get('title'),
                description: newCoupon.get('description')
            });
        })
        .catch(err => {
            console.log("The coupon cannot be created.");
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(err);
        })

};

exports.getFromId = function (req, res, next) {

    Coupon.findOne({
        where: {
            id: req.params.coupon_id,
            [Op.or]: [
                {owner: req.user.id},
                {consumer: req.user.id}
            ]
        }
    })
        .then(coupon => {
            if (coupon === null) {
                return res.status(HttpStatus.OK).json({
                    error: 'No coupon found with the given id and the given user',
                    coupon_id: req.params.coupon_id,
                    user_id: req.user.id
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

exports.getCreatedCoupons = function (req, res, next) {
    Coupon.findAll({
        where: { owner: req.user.id }
    })
        .then(coupons => {
            return res.status(HttpStatus.OK).json(coupons)
        })
        .catch(err => {
            // return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            //     error: err
            // })
            return res.send(JSON.stringify(err));
        });
};

exports.getPurchasedCoupons = function (req, res, next) {
    // Coupon.findAll({
    //     where: { consumer: req.user.id }
    // })
    Sequelize.query('SELECT *, COUNT(*) AS quantity FROM coupons WHERE consumer = $1  GROUP BY token',
        { bind: [req.user.id], type: Sequelize.QueryTypes.SELECT },
        { model: Coupon })
        .then(coupons => {
            return res.status(HttpStatus.OK).json(coupons)
        })
        .catch(err => {
            // return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            //     error: err
            // })
            return res.send(JSON.stringify(err));
        });
};

exports.getAffordables = function (req, res, next) {
    Coupon.findAll({
        where: {
            [Op.and]: [
                {
                    consumer: {
                        [Op.eq]: null    // coupon is not bought yet
                    }
                },
                {
                    valid_from: {
                        [Op.lte]: new Date()
                    }
                },
                {
                    valid_until: {
                        [Op.or]: [
                            { [Op.gte]: new Date() },
                            { [Op.eq]: null }
                        ]
                    }
                }
            ]
        }
    })
        .then(coupons => {
            return res.status(HttpStatus.OK).json(coupons)
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: 'Cannot GET coupons affordable'
            })
        });

};

exports.getDistinctCoupons = function(req, res, next) {
    Sequelize.query('SELECT *, COUNT(*) AS quantity FROM coupons WHERE consumer IS NULL GROUP BY title, description, price', { model: Coupon })
        .then(coupons => {
            return res.status(HttpStatus.OK).send(coupons);
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the distinct coupons'
            })
        })
};
exports.getDistinctCreatedCoupons = function(req, res, next) {
    Sequelize.query('SELECT *, COUNT(*) AS quantity FROM coupons WHERE owner = $1 GROUP BY title, description, price',
        { bind: [req.user.id], type: Sequelize.QueryTypes.SELECT },
        { model: Coupon })
        .then(coupons => {
            return res.status(HttpStatus.OK).send(coupons);
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the distinct coupons created'
            })
        })
};



exports.getCouponsCreatedFromTitleDescriptionPrice = function(req, res, next) {

    console.log('dati arrivati:', req.params.title, req.params.description, req.params.price)
    let description;
    if(req.params.description == 'null'){
        description = null;
    } else {
        description = req.params.description;
    }
    Coupon.findAll({
        where: {
            title: req.params.title,
            description: description,

            // [Op.or]: [
            //     {owner: req.user.id},
            //
            // ]
        },
        like: {
            price: Number(req.params.price),
        }
    }).then(coupons => {
        if (coupons === null) {
            return res.status(HttpStatus.OK).json({
                error: 'No coupon found with the data and the given user',
                token: req.params.token,
                user_id: req.user.id
            })
        }

        return res.status(HttpStatus.OK).json(coupons)
    }).catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the distinct coupons created'
            })
        })
};

exports.update = function (req, res, next) {
    const data = req.body;

    Coupon.update({
        title: data.title,
        description: data.description,
        image: data.image,
        price: data.price,
        valid_from: Number(data.valid_from),
        valid_until: Number(data.valid_until),
        state: data.state,
        constraints: data.constraints,
        quantity: data.quantity,
        token:data.token,
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
                {id: req.body.id},
                {owner: req.user.id}
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

exports.addImage = function (req, res, next) {
    // console.log(req);

    fs.readFile(req.files.file.path, function (err, data) {
        // set the correct path for the file not the temporary one from the API:
        const file = req.files.file;
        file.path = path.join(__dirname, "../media/images/" + file.name);

        // copy the data from the req.files.file.path and paste it to file.path
        fs.writeFile(file.path, data, function (err) {
            if (err) {
                console.warn(err);

                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                    name: 'Upload Image Error',
                    message: 'A problem occurred during upload of the image'
                })
            }

            return res.status(HttpStatus.CREATED).send({
                inserted: true,
                image: file.name,
                path: file.path
            });
        });
    });
};

exports.buyCoupon = function (req, res, next) {
  let couponID = req.body.coupon_id;

  console.log("coupon id: " + couponID);

  Coupon.update({
      consumer: req.user.id
  }, {
      where: {
          id: couponID
      }
  })
      .then(bought => {
          return res.status(HttpStatus.OK).json({
              updated: true,
              coupon_id: couponID
          })
      })
      .catch(err => {
          console.log(err);

          return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
              updated: false,
              coupon_id: couponID,
              error: 'Cannot buy the coupon'
          })
      });
};


exports.validate = function (req, res, next) {
    const data = req.body;

    Coupon.update({
        consumer: req.user.id,
        token:data.token,
    }, {
        where: {
            [Op.and]: [
                {token:data.token},
            ]
        }
    })
        .then(couponUpdated => {
            return res.status(HttpStatus.OK).json({
                validate: true,
                coupon_id: data.id
            })
        })
        .catch(err => {
            console.log(err);

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                validate: false,
                coupon_id: data.id,
                error: 'Cannot validate the coupon'
            })
        });
};
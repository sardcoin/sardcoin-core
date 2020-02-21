'use strict';

/** Models and DB **/
const Order = require('../models/index').Order;
const Coupon = require('../models/index').Coupon;
const Op = require('../models/index').Sequelize.Op;
const Verifier = require('../models/index').Verifier;
const Sequelize = require('../models/index').sequelize;
const CouponToken = require('../models/index').CouponToken;
const OrderCoupon = require('../models/index').OrderCoupon;
const PackageTokens = require('../models/index').PackageTokens;
const CouponsCategories = require('../models/index').CouponsCategories;
const CouponsBrokers = require('../models/index').CouponBroker;
const User = require('../models/index').User;
/** Managers **/
const CouponBrokerManager = require('./coupon-broker-manager');
const CategoriesManager = require('./categories-manager');
const CouponTokenManager = require('./coupon-token-manager');
const OrdersManager = require('./orders-manager');
const PackageManager = require('./package-manager');
const PaypalManager = require('./paypal-manager');

/** Libraries and costants **/
const HttpStatus = require('http-status-codes');
const fs = require('file-system');
const path = require('path');
const crypto = require('crypto');
const _ = require('lodash');

const ITEM_TYPE = {
    COUPON: 0,
    PACKAGE: 1
};

/** Exported REST functions **/
const createCoupon = async (req, res) => {
    const data = req.body;
    let insertResult, newToken, couponToken, token, pack_coupon_id;

    try {
        insertResult = await insertCoupon(data, req.user.id);

        if (insertResult) { // If the coupon has been created
            for (let category of data.categories) {
                await CategoriesManager.assignCategory({coupon_id: insertResult.dataValues.id, category_id: category.id})
            } // Category association

            if (data.brokers) {
                if (data.type === ITEM_TYPE.PACKAGE) {
                    await internal_deleteCoupon(insertResult);
                    return res.status(HttpStatus.BAD_REQUEST).send({
                        error: true,
                        message: 'It is not possible to add a broker authorized to use a package.'
                    });
                } // The package cannot be transferred to another broker
                for (let broker of data.brokers) {
                    const newBroker = await CouponBrokerManager.insertCouponBroker(insertResult.get('id'), broker.id);
                } // for each broker it associates the coupon created to him
            } // Broker association

            // It creates 'quantity' tokens for the coupon inserted
            for (let i = 0; i < data.quantity; i++) {
                token = generateUniqueToken(data.title, req.user.password);

                if (data.type === ITEM_TYPE.COUPON) {
                    newToken = await CouponTokenManager.insertCouponToken(insertResult.get('id'), token);
                } else {
                    await PackageManager.insertTokenPackage(insertResult.get('id'), token);

                    for (const pack of data.package) {
                        pack_coupon_id = pack.coupon.id;

                        for (let j = 0; j < pack.quantity; j++) {
                            couponToken = await CouponTokenManager.getTokenByIdCoupon(pack_coupon_id);
                            newToken = await CouponTokenManager.updateCouponToken(couponToken.dataValues.token, pack_coupon_id, null, token, null);
                        }
                    }
                }

                if (!newToken) {
                    console.error('Error either inserting or updating the CouponToken associated to the coupon');
                    await internal_deleteCoupon(insertResult.dataValues.id);

                    if(couponToken) {
                        await CouponTokenManager.updateCouponToken(couponToken.dataValues.token, pack_coupon_id);
                    }

                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                        error: true,
                        message: 'Error creating the tokens.',
                    });
                }
            }

            return res.status(HttpStatus.CREATED).send({
                created: true,
                title: data.title,
                quantity: data.quantity
            });

        } else {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Error inserting the new coupon.',
            });
        }

    } catch (e) {
        console.error(e);

        if (insertResult) { // TODO probably to catch
            await internal_deleteCoupon(insertResult.dataValues.id);
        }

        if (couponToken) {
            await CouponTokenManager.updateCouponToken(couponToken.dataValues.token, pack_coupon_id);
        }

        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'Error inserting the new coupon.',
        });
    }
};

const getFromId = (req, res) => {

    Coupon.findOne({
        where: {id: req.params.coupon_id}
    })
        .then(coupon => {
            if (coupon === null) {
                return res.status(HttpStatus.NO_CONTENT).send({
                    error: 'No coupon found with the given id.',
                    coupon_id: parseInt(req.params.coupon_id),
                })
            }

            return res.status(HttpStatus.OK).send(coupon)
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot GET the information about the coupon.'
            })
        });
};

const getByToken = async (req, res) => {
    let coupon_token, coupon_id, coupon;
    let token = req.params.token;
    let type = parseInt(req.params.type);

    try {
        coupon_token = type === ITEM_TYPE.COUPON
            ? await CouponToken.findOne({where: {token: token}})
            : await PackageTokens.findOne({where: {token: token}});

        if (coupon_token) {
            coupon_id = type === ITEM_TYPE.COUPON ? coupon_token.dataValues.coupon_id : coupon_token.dataValues.package_id;
            coupon = await Coupon.findOne({where: {id: coupon_id}});

            if (coupon) {
                return res.status(HttpStatus.OK).send(coupon);
            } else {
                return res.status(HttpStatus.NO_CONTENT).send({});
            }
        } else {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: true,
                message: 'Cannot retrieve the coupon: either the token or the type are not correct.'
            })
        }
    } catch (e) {
        console.error(e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'An error occurred while retrieving the coupon'
        })
    }
};
const getProducerCoupons = (req, res) => {
    Sequelize.query(
        'SELECT id, title, description, image, price, visible_from, valid_from, valid_until, purchasable, constraints, owner, type, ' +
        'COUNT(CASE WHEN consumer IS NOT null AND verifier IS null THEN 1 END) AS buyed, COUNT(*) AS quantity ' +
        'FROM coupons JOIN coupon_tokens ON coupons.id = coupon_tokens.coupon_id WHERE owner = $1 ' +
        'GROUP BY id',
        {bind: [req.user.id], type: Sequelize.QueryTypes.SELECT},
        {model: Coupon})
        .then(coupons => {
            if (coupons.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send({});
            }
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
const getPurchasedCoupons = async (req, res) => {
    let coupons;

    try {
        coupons = await Sequelize.query('' +
            'SELECT coupons.*, coupon_tokens.token, coupon_tokens.consumer, coupon_tokens.package, coupon_tokens.verifier, purchase_time ' +
            ', COUNT(CASE WHEN coupon_tokens.verifier IS not null THEN 1 END) AS consumed ' +
            ', COUNT(CASE WHEN coupon_tokens.verifier IS null THEN 1 END) AS verifiable ' +
            'FROM coupons  ' +
            'JOIN coupon_tokens ON coupons.id = coupon_tokens.coupon_id ' +
            'JOIN orders_coupons ON orders_coupons.coupon_token = coupon_tokens.token ' +
            'JOIN orders ON orders.ID = orders_coupons.order_id ' +
            'WHERE coupon_tokens.consumer = :consumer group by coupon_tokens.token ' +
            'UNION ( ' +
            '    SELECT coupons.*, package_tokens.token, package_tokens.consumer, coupon_tokens.package, coupon_tokens.verifier, purchase_time ' +
            ', COUNT(CASE WHEN coupon_tokens.verifier IS not null THEN 1 END) AS consumed ' +
            ', COUNT(CASE WHEN coupon_tokens.verifier IS null THEN 1 END) AS verifiable ' +
            '    FROM coupons  ' +
            '    JOIN package_tokens ON coupons.id = package_tokens.package_id ' +
            '    JOIN orders_coupons ON orders_coupons.package_token = package_tokens.token ' +
            '    JOIN orders ON orders.ID = orders_coupons.order_id ' +
            '    JOIN coupon_tokens ON coupon_tokens.package = orders_coupons.package_token ' +
            '    WHERE package_tokens.consumer = :consumer group by package_tokens.token' +
            ')  ' +
            'ORDER BY `id` ASC',
            {replacements: {consumer: req.user.id}, type: Sequelize.QueryTypes.SELECT},
            {model: Coupon});

        if (coupons.length === 0) {
            return res.status(HttpStatus.NO_CONTENT).send({});
        }

        for(let coupon of coupons) {
            coupon = formatCoupon(coupon);
        }
        return res.status(HttpStatus.OK).send(coupons);

    } catch (e) {
        console.log(e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'Error retrieving purchased coupons'
        })
    }

};
const getPurchasedCouponsById = (req, res) => {
    //console.log('req.params.coupon_idreq.params.coupon_id',req.params)
    Coupon.findAll({
        include: [{
            model: CouponToken,
            required: true,
            where: {consumer: req.user.id, coupon_id: req.params.coupon_id}
        }],
        attributes: {include: [[Sequelize.fn('COUNT', Sequelize.col('coupon_id')), 'bought']]}
    })
        .then(coupons => {
            //console.log('coupons, coupons', coupons)
            if (coupons[0].dataValues.CouponTokens.length === 0) {
                PackageTokens.findAll({

                        where: {consumer: req.user.id, package_id: req.params.coupon_id},

                    attributes: {include: [[Sequelize.fn('COUNT', Sequelize.col('package_id')), 'bought']]}
                }).then( packages => {
                    if (packages.length === 0) {
                        return res.status(HttpStatus.NO_CONTENT).send({});

                    }
                    return res.status(HttpStatus.OK).send({
                        coupon_id: req.params.coupon_id,
                        bought: packages[0].dataValues.bought,
                        type: 1
                    });
                }).catch(err => {
                    console.log(err);
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                        error: true,
                        message: 'Error retrieving purchased packages'
                    })
                });
            } else {
                return res.status(HttpStatus.OK).send({
                    coupon_id: req.params.coupon_id,
                    bought: coupons[0].dataValues.bought,
                    type: 0
                });
            }


        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Error retrieving purchased coupons'
            })
        });
};
const getAvailableCoupons = async (req, res) => {
    let coupons;

    try {
        coupons = await availableCoupons();

        //console.log('couponscoupons', coupons )
        if (coupons.length === 0) {
            return res.status(HttpStatus.NO_CONTENT).send({});
        }
        return res.status(HttpStatus.OK).send(coupons)
    } catch (err) {
        console.log(err);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: 'Cannot GET available coupons'
        })
    }
};
const getAvailableCouponsByCategory = async (req, res) => {
    let coupons;

    try {
        coupons = await availableCouponsByCategoryId(req.params.category_id);

        if (coupons.length === 0) {
            return res.status(HttpStatus.NO_CONTENT).send({});
        }

        return res.status(HttpStatus.OK).send(coupons)
    } catch (err) {
        console.log(err);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: 'Cannot GET available coupons by category ID'
        })
    }
};
const getAvailableByTextAndCatId = async (req, res) => {
    let coupons;
    let text = req.params.text;

    try {
        // The text received is separated by dash
        text = text.split('-').toString().replace(new RegExp(',', 'g'), ' ').toLowerCase();
        coupons = filterCouponsByText((await availableCouponsByCategoryId(req.params.category_id)), text);

        if (coupons.length === 0) {
            return res.status(HttpStatus.NO_CONTENT).send({});
        }

        return res.status(HttpStatus.OK).send(coupons)
    } catch (err) {
        console.log(err);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: 'Cannot GET available coupons by category ID and text inserted'
        })
    }
};

//unused
const isCouponRedeemed = async (req, res) => { // TODO
    const token = req.params.token, type = req.params.type;
    let response;

    try {


    } catch (e) {

    }
};

// The application could fail in every point, revert the buy in that case
const buyCoupons = async (req, res) => {
    //console.log('req.body', req.body)

    const list = req.body.coupon_list;
    const quantity = req.body.coupon_list[0].quantity
    const price = req.body.coupon_list[0].price

    const producer_id = req.body.producer_id
    const payment_id = req.body.payment_id
    //console.log('payment_id buyCoupons', payment_id)
    // verifica che è in stallo

        try {
            const isPrepared = await CouponTokenManager.isCouponsPendening(req.user.id, list[0].id, list[0].quantity)
            //console.log('is prepared', isPrepared)
            if (!isPrepared) {
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                    error: true,
                    call: 'buyCoupons',
                    message: 'An error occurred while finalizing the purchase, no correct prepare coupon'
                });
            } else if (payment_id) {
                     // TODO facilmente raggirabile se si modifica il frontend, occorre controllare che il coupon da acquistare
                    //TODO  ha effettivabente quel prezzo altrimenti si può prendere gratis!!!!
                const payment = await PaypalManager.captureOrder(payment_id, producer_id)
                //console.log('payment description', payment)
                //console.log('payment.purchase_units[0].payments description', payment.purchase_units[0].payments)
                //console.log('payment.purchase_units[0].payments.captures[0].amount description', payment.purchase_units[0].payments.captures[0].amount)
                const valute = payment.purchase_units[0].payments.captures[0].amount.currency_code
                if (valute != 'EUR') {
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                        error: true,
                        call: 'buyCoupons',
                        message: 'An error occurred while finalizing the purchase, error valute'
                    })
                }
                const value = payment.purchase_units[0].payments.captures[0].amount.value
                if (price * quantity != value) {
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                        error: true,
                        call: 'buyCoupons',
                        message: 'An error occurred while finalizing the purchase, error total amount'
                    })
                }

            }
        } catch (e) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                call: 'buyCoupons',
                message: 'An error occurred while finalizing the purchase, error result prepare coupon'
            })
        }
    //TODO verifica che è acquistato...... captureOrder DI PAYPAL


    let order_list = [];
    let query = 'START TRANSACTION; ';
    let tokenToExclude = [];
    let buyQueryResult;
    let order_id;

    const lock = await lockTables();

    if (!lock) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            call: 'buyCoupons',
            message: 'An error occurred while finalizing the purchase'
        });
    }
    //console.log('console.log(list)', list)
    for (let i = 0; i < list.length; i++) {
        try {
            tokenToExclude = [];

            for (let j = 0; j < list[i].quantity; j++) {
                buyQueryResult = await getBuyQuery(list[i].id, req.user.id, list[i].type, tokenToExclude);
                if (!buyQueryResult.error) {
                    query += buyQueryResult.query;
                    tokenToExclude.push(buyQueryResult.token);
                    order_list.push({token: buyQueryResult.token, type: list[i].type});
                } else {
                    await unlockTables();
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                        error: true,
                        call: 'buyCoupons',
                        message: 'An error occurred while finalizing the purchase'
                    })
                }
            }
        } catch (e) {
            console.error(e);
            await unlockTables();
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                call: 'buyCoupons',
                message: 'An error occurred while finalizing the purchase'
            })
        }
    }

    query += 'COMMIT';

    console.log('FINAL QUERY');
    //console.log(query);
    // return res.send({query: query, order_list: order_list});

    Sequelize.query(query, {type: Sequelize.QueryTypes.UPDATE}, {model: CouponToken})
        .then(async result => {
            if (result[0] === 0) { // The database has not been updated
                await unlockTables();

                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                    error: true,
                    call: 'buyCoupons',
                    message: 'An error occured while finalizing the purchase'
                });
            }

            // The purchase is done
            await unlockTables();
            order_id = await OrdersManager.createOrderFromCart(req.user.id, order_list);

            return res.status(HttpStatus.OK).send({
                success: true,
                message: 'The purchase has been finalized',
                order_id: order_id
            })
        })
        .catch(async err => {
            console.log(err);
            await unlockTables();

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                call: 'buyCoupons',
                message: 'An error occured while finalizing the purchase'
            });
        });
};
const editCoupon = async (req, res) => {
    const data = req.body;
    try {
        if (data.type === ITEM_TYPE.PACKAGE) {
            const result = await getPackageBought(data.id)
            if (result) {
                return res.status(HttpStatus.OK).send({
                    error: true,
                    bought: true,
                    message: 'Is not possible update package, This package is bought.'
                });
            } else {
                //console.log('modificabile')
            }
        }
        if (data.type === ITEM_TYPE.COUPON) {
            const result = await getCouponBought(data.id)
            if (result) {
                return res.status(HttpStatus.OK).send({
                    error: true,
                    bought: true,
                    message: 'Is not possible update coupon, This coupon is bought.'
                });
            }
        }
    } catch (e) {
        console.warn(e)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'Is not possible update coupon or package, error from server.'
        });
    }

    let valid_until = data.valid_until === null ? null : Number(data.valid_until) === 0?null:  Number(data.valid_until) ;
    let visible_from = data.visible_from === null ? null : Number(data.visible_from)==0?null: Number(data.visible_from);
    Coupon.update({
        title: data.title,
        description: data.description,
        image: data.image,
        price: data.price,
        visible_from: visible_from,
        valid_from: Number(data.valid_from),
        valid_until: valid_until,
        constraints: data.constraints,
        purchasable: data.purchasable,
        brokers: data.brokers
    }, {
        where: {
            [Op.and]: [
                {owner: req.user.id},
                {id: data.id}
            ]
        }
    })
        .then(async couponUpdated => {
            if (couponUpdated[0] === 0) {
                return res.status(HttpStatus.NO_CONTENT).json({
                    updated: false,
                    coupon_id: data.id,
                    message: "This coupon doesn't exist"
                })
            }
            else {

                try {
                    await CategoriesManager.removeAllCategory({
                        coupon_id: data.id,
                    });
                    await CouponBrokerManager.removeAllCouponsBroker({
                        coupon_id: data.id,
                    })
                } catch (e) {

                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                        error: true,
                        message: 'Error deleted categories.'
                    });
                }
                if (data.categories) {
                    for (let i = 0; i < data.categories.length; i++) {
                        try {
                            await CategoriesManager.assignCategory({
                                coupon_id: data.id,
                                category_id: data.categories[i].id
                            })
                        } catch (e) {

                            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                                error: true,
                                message: 'Error assign categories.'
                            });
                        }

                    }
                }
                    if (data.brokers) {
                        for (let broker of data.brokers) {
                            const newBroker = await CouponBrokerManager.insertCouponBroker(data.id, broker.id);
                        }// for each broker it associates the coupon created to him
                    }// Broker association

                return res.status(HttpStatus.OK).json({
                    updated: true,
                    coupon_id: data.id
                })
            }
        })
        .catch(err => {
            console.log(err);

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                updated: false,
                coupon_id: data.id,
                error: 'Cannot edit the coupon'
            })
        });
};
const deleteCoupon = async (req, res) => {
    try {
        const data = (await getFromIdIntern(req.body.id)).dataValues
        if (data.type === ITEM_TYPE.PACKAGE) {
            const result = await getPackageBought(data.id)
            if (result) {
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                    error: true,
                    bought: true,
                    message: 'Is not possible delete package, This package is bought.'
                });
            } else {
                //console.log('modificabile')
            }
        }
        if (data.type === ITEM_TYPE.COUPON) {
            const result = await getCouponBought(data.id)
            if (result) {
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                    error: true,
                    bought: true,
                    message: 'Is not possible delete coupon, This coupon is bought.'
                });
            }
        }
    } catch (e) {
        console.warn(e)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'Is not possible delete coupon, error from server.'
        });

    }

    CouponsBrokers.destroy({
        where: {
          coupon_id: req.body.id
        }
    }).then( result => {
        if((!result || result === 0 ) && req.body.type === 1){
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                deleted: false,
                coupon: parseInt(req.body.id),
                error: 'Cannot delete Coupon the coupon, internal error'
            })
        } else {
            Coupon.destroy({
                where: {
                    [Op.and]: [
                        {id: req.body.id},
                        {owner: req.user.id}
                    ]
                }
            })
                .then(coupon => {
                    if (coupon === 0) {
                        return res.status(HttpStatus.NO_CONTENT).json({
                            deleted: false,
                            coupon: parseInt(req.body.id),
                            message: "This coupon doesn't exist or you doesn't own the coupon!"
                        });
                    } else {
                        return res.status(HttpStatus.OK).json({
                            deleted: true,
                            coupon: parseInt(req.body.id),
                        });
                    }
                })
                .catch(err => {
                    console.log(err);

                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                        deleted: false,
                        coupon: parseInt(req.body.id),
                        error: 'Cannot deleteCoupon the coupon'
                    })
                })
        }
    }).catch( err => {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            deleted: false,
            coupon: parseInt(req.body.id),
            error: 'Cannot deleteCoupon the coupon, internal error'
        })
    })

};
const importOfflineCoupon = (req, res) => {
    const data = req.body;

    CouponToken.findOne({
        where: {
            [Op.and]: [
                {consumer: {[Op.is]: 5}},
                {verifier: {[Op.is]: null}},
                {token: data.token},
            ]
        }
    })
        .then(coupon => {
            if (coupon === null) {
                return res.status(HttpStatus.NO_CONTENT).json({
                    error: 'No coupon found with the given token.',
                    token: data.token,
                })
            }

            CouponTokenManager.updateCouponToken(data.token, coupon.dataValues.coupon_id, req.user.id)
                .then(async update => {
                    if (update) {
                        let newOrder, order_id, newOrderCoupon
                        try {
                            newOrder = await Order.create({consumer: req.user.id, purchase_time: (new Date()).getTime()});
                            order_id = newOrder.dataValues.id;
                            newOrderCoupon = await OrderCoupon.create({
                                order_id: order_id,
                                coupon_token: data.token,
                                package_token: null
                            });

                        } catch (e) {
                            if (order_id) {
                                await OrderCoupon.destroy({where: {order_id: order_id}});
                                await Order.destroy({where: {id: order_id}});
                            }

                            console.error(e);
                            throw new Error('createOrderFromCart -> Error creating the order');
                        }
                        return res.status(HttpStatus.OK).send({
                            imported: true,
                            token: data.token,
                            coupon_id: coupon.dataValues.coupon_id
                        });
                    }

                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                        error: true,
                        message: 'Some problem occurred during the import of the offline coupon.'
                    })
                });
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Some problem occurred during the import of the offline coupon.'
            })
        })
};

const importOfflinePackage = async (req, res) => {
    const data = req.body;
    const coupons = await CouponTokenManager.getCouponsByTokenPackage(data.token)
    //console.log('couponscoupons', coupons)
    if (coupons.length === 0){
        return res.status(HttpStatus.NO_CONTENT).json({
            message: 'No package found with the given token.',
            token: data.token,
            error: true,

        })
    }
    for (const coupon of coupons){
        CouponTokenManager.updatePackageToken(coupon.token, coupon.coupon_id, req.user.id, coupon.package, null)
            .then(async update => {
                if (!update) {
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                        error: true,
                        message: 'Some problem occurred during the import of the offline package.'
                    })
                }
                let newOrder, order_id, newOrderCoupon
                try {
                    newOrder = await Order.create({consumer: req.user.id, purchase_time: (new Date()).getTime()});
                    order_id = newOrder.dataValues.id;
                    newOrderCoupon = await OrderCoupon.create({
                        order_id: order_id,
                        coupon_token: null,
                        package_token: coupon.package
                    });
                    await PackageTokens.update({consumer: req.user.id},
                        {
                            where: {token: coupon.package
                            }
                    })

                } catch (e) {
                    if (order_id) {
                        await OrderCoupon.destroy({where: {order_id: order_id}});
                        await Order.destroy({where: {id: order_id}});
                        await PackageTokens.destroy({where: {token: coupon.package}});

                    }

                    console.error(e);
                    throw new Error('createOrderFromCart -> Error creating the order');
                }



            });
    }
    return res.status(HttpStatus.OK).send({
        error: false,
        package: data.token,
    })
};


const redeemCoupon = (req, res) => {
    const data = req.body;
    const verifier_id = req.user.id;

    // Join between CouponToken and Coupon where token = givenToken and consumer is not null
    CouponToken.findOne({
        include: [{model: Coupon, required: true}],
        where: {
            [Op.and]: [
                {token: data.token}, {consumer: {[Op.not]: null}}, {verifier: {[Op.is]: null}}
            ]
        }
    }).then( async result => {
        //console.log( 'resultresultresult', result)

            if (!result) {
                const resp = await returnRedeemCouponList(data.token, verifier_id)
                //console.log( 'resp', resp)
                if (resp.redeemed){
                    //console.log( 'resp.redeemed', resp.redeemed)
                    return res.status(HttpStatus.OK).send({
                        redeemed: true,
                        token: resp.token,
                    });

                } else if (resp.coupons && resp.coupons.length > 0) {
                    //console.log('resp.coupons && resp.coupons.length > 0')
                    return res.status(HttpStatus.OK).send({
                        coupons: resp.coupons,
                    });
                } else {
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                        error: true,
                        message: 'Some problem occurred during the operation of redeeming.'
                    });
                }
            } else {
                const couponTkn = {
                        token: data.token,
                        coupon_id: result.dataValues.coupon_id,
                        consumer: result.dataValues.consumer,
                        package: result.dataValues.package
                    };
                    const producer_id = result.dataValues.Coupons[0].dataValues.owner;

                await isVerifierAuthorized(producer_id, verifier_id)
                    .then(authorization => {
                        if (authorization && couponTkn) { // If the verifier is authorized, it redeems the coupon

                            CouponTokenManager.updateCouponToken(couponTkn.token, couponTkn.coupon_id, couponTkn.consumer, couponTkn.package, verifier_id)
                                .then(update => {
                                    if (update) {
                                        return res.status(HttpStatus.OK).send({
                                            redeemed: true,
                                            token: data.token,
                                        });
                                    } else {
                                        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                                            error: true,
                                            message: 'Some problem occurred during the operation of redeeming.'
                                        });
                                    }
                                })
                                .catch(err => {
                                    console.log(err);

                                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                                        error: true,
                                        message: 'Some problem occurred during the operation of redeeming.'
                                    })
                                })
                        } else {
                            console.log("I cant't");
                            return res.status(HttpStatus.BAD_REQUEST).send({
                                error: true,
                                message: 'Either you are not authorized to redeem the selected coupon or the coupon was already redeemed.',
                            })
                        }
                    })
                    .catch(err => {
                        console.log(err);

                        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                            error: true,
                            message: 'Some problem occurred during the operation of redeeming.'
                        })
                    })
            }
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Some problem occurred during the redeem of the coupon.'
            })
        })
};
const addImage = (req, res) => {
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

/** Private methods **/

const filterCouponsByText = (coupons, text) => {
    return coupons.filter(coupon => coupon.title.toLowerCase().includes(text) || coupon.description.toLowerCase().includes(text));
};
const availableCoupons = async () => {
    return await Sequelize.query(
        'SELECT id, title, description, image, price, visible_from, valid_from, valid_until, purchasable, constraints, owner, type,  COUNT(*) AS quantity, 0 AS quantity_pack ' +
        'FROM coupons ' +
        'JOIN coupon_tokens ON coupons.id = coupon_tokens.coupon_id ' +
        'WHERE coupon_tokens.consumer IS NULL ' +
        'AND coupon_tokens.package IS NULL ' +
        'AND coupons.visible_from IS NOT NULL ' +
        'AND coupons.visible_from <= CURRENT_TIMESTAMP AND coupons.valid_from <= CURRENT_TIMESTAMP  ' +
        'AND (coupons.valid_until >= CURRENT_TIMESTAMP OR coupons.valid_until IS NULL) ' +
        'GROUP BY coupons.id ' +
        'UNION ( ' +
        '  SELECT id, title, description, image, price, visible_from, valid_from, valid_until, purchasable, constraints, owner, type,  COUNT(*) AS quantity, COUNT(DISTINCT coupon_tokens.package) AS quantity_pack  ' +
        '  FROM coupons ' +
        '  JOIN package_tokens ON coupons.id = package_tokens.package_id' +
        '  JOIN coupon_tokens ON package_tokens.token = coupon_tokens.package ' +
        '  WHERE package_tokens.consumer IS NULL ' +
        '  AND coupons.visible_from IS NOT NULL ' +
        '  AND coupons.visible_from <= CURRENT_TIMESTAMP AND coupons.valid_from <= CURRENT_TIMESTAMP ' +
        '  AND (coupons.valid_until >= CURRENT_TIMESTAMP OR coupons.valid_until IS NULL) ' +
        '  GROUP BY  coupons.id  ' +
        ')',
        {type: Sequelize.QueryTypes.SELECT},
        {model: Coupon}
    );
};
const availableCouponsByCategoryId = async (category_id) => {
    let coupons, ids, filtered;

    coupons = await availableCoupons();

    if (category_id > 0) {
        // GET the coupon with category :category_id
        ids = _.map(coupons, 'id'); // get all the IDs of the available coupons
        filtered = await CouponsCategories.findAll({where: {category_id: category_id, coupon_id: {[Op.in]: ids}}});

        // GET the full coupon data
        ids = _.map(filtered, 'coupon_id');
        filtered = _.filter(coupons, el => ids.includes(el.id)); // filter the coupon from the available iff they belong to the category given
    } else {
        filtered = coupons;
    }

    return filtered;

}; // If category_id = 0, all coupons are returned
const generateUniqueToken = (title, password) => {

    const min = Math.ceil(1);
    const max = Math.floor(1000000);
    const total = Math.floor(Math.random() * (max - min)) + min;

    return crypto.createHash('sha256').update(title + password + total.toString()).digest('hex').substr(0, 8).toUpperCase();

}; // Generates a 8-char unique token based on the coupon title and the user (hashed) passwpord
const formatNotIn = (tokenList) => {
    let result = '(';

    for (let i = 0; i < tokenList.length; i++) {
        result += '"' + tokenList[i] + '"';
        if (i + 1 !== tokenList.length) {
            result += ',';
        }
    }

    return result + ')';
};
const internal_deleteCoupon = async (coupon_id) => {
    let deletion;

    try {
        deletion = await Coupon.destroy({where: {id: coupon_id}});
    } catch (e) {
        console.warn('There was an error during the deletion of the coupon with id ' + coupon_id);
        console.error(e);
    }
};

/** This methods create the update query in the purchasing process **/
/**
 * This method check if the coupon can be buy from the consumer.
 * If there is a package in the cart, the controls are the same but the method returns a different update query.
 *
 * How this method works:
 * 1. Check if the coupon is not expired
 * 2. Check if the coupon is purchasable (this is being done for each coupon in a package)
 * 3. GET an available token for the coupon/package (if there is none, the articles are terminated)
 * 4. If there are no kind of errors, it returns the update query
 *
 * ERROR RETURN: {error: true, code: codeError, message: messageError}
 * RIGHT RETURN: {error: false, token: tokenBooked, message: messageError}
 * **/
const getBuyQuery = async (coupon_id, user_id, type = 0, tokenExcluded = []) => {
    return type === 0
        ? await getBuyCouponQuery(coupon_id, user_id, tokenExcluded)
        : await getBuyPackageQuery(coupon_id, user_id, tokenExcluded);
};
const getBuyCouponQuery = async (coupon_id, user_id, tokenExcluded = []) => {
    let lastPieceOfQuery = tokenExcluded.length === 0 ? '' : 'AND token NOT IN ' + formatNotIn(tokenExcluded);
    let isNotExpired, isPurchasable, coupon, result;

    try {
        isNotExpired = await isCouponNotExpired(coupon_id);
        isPurchasable = await isItemPurchasable(coupon_id, user_id, ITEM_TYPE.COUPON);

        // TODO aggiungere prepare = user_id (utente intenzionato all'acquisto)

        if (isNotExpired && isPurchasable) {
            coupon = await Sequelize.query('SELECT * FROM `coupon_tokens` AS `CouponTokens` WHERE consumer IS NULL AND prepare = :user_id ' +
                'AND coupon_id = :coupon_id AND package IS NUll ' + lastPieceOfQuery + 'LIMIT 1',
                {replacements: {coupon_id: coupon_id, user_id: user_id}, type: Sequelize.QueryTypes.SELECT},
                {model: CouponToken}
            );

            if (coupon === null) {
                console.error('ERROR in COUPON-MANAGER:');
                console.error('USER=' + user_id + ' asked for buying either an unknown coupon or an out of stock coupon with ID=' + coupon_id);
                result = {
                    error: true,
                    code: HttpStatus.BAD_REQUEST,
                    message: 'Either the coupon is unknown or it is out of stock'
                };
            } else {
                result = {
                    error: false,
                    token: coupon[0].token,
                    query: 'UPDATE `coupon_tokens` SET `consumer`=' + user_id + ' WHERE `coupon_id`=' + coupon_id + ' AND `token`="' + coupon[0].token + '"; '
                };
            }

        } else {
            console.log('ERROR in COUPON MANAGER:\nCoupon with ID=' + coupon_id + ' is not purchasable or expired');
            result = {error: true, code: HttpStatus.BAD_REQUEST, message: 'Coupon not purchasable or expired'};
        }

    } catch (err) {
        console.log('ERROR in COUPON-MANAGER somewhere when checking if coupon with ID=' + coupon_id + ' is expired/purchasable:');
        console.error(err);
        result = {
            error: true,
            code: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Error somewhere when creating the query update for the coupon with id ' + coupon_id
        };
    }

    return result;
};
const getBuyPackageQuery = async (package_id, user_id, tokenExcluded = []) => {
    let lastPieceOfQuery = tokenExcluded.length === 0 ? '' : 'AND PackageTokens.token NOT IN ' + formatNotIn(tokenExcluded);
    let isNotExpired = true, isPurchasable = true;
    let pack, result = [];

    try {
        // Check if the package is not expired and purchasable
        isNotExpired = await isCouponNotExpired(package_id);
        isPurchasable = await isItemPurchasable(package_id, user_id, ITEM_TYPE.PACKAGE);

        if (isNotExpired && isPurchasable) {
            // Select a package with ID package_id iff there is one pack available
            pack = await Sequelize.query(
                'SELECT PackageTokens.token, CouponTokens.coupon_id, CouponTokens.consumer ' +
                'FROM package_tokens AS PackageTokens JOIN coupons AS Coupon ON PackageTokens.package_id = Coupon.id ' +
                'JOIN coupon_tokens AS CouponTokens ON CouponTokens.package = PackageTokens.token ' +
                'WHERE CouponTokens.consumer IS NULL AND PackageTokens.package_id = :package_id AND prepare = :user_id' + lastPieceOfQuery + ' LIMIT 1',
                {replacements: {package_id: package_id, user_id: user_id}, type: Sequelize.QueryTypes.SELECT},
                {model: PackageTokens}
            );

            // If there is a pack available, it checks the ability to be purchased for each coupon in the package
            if (pack) {
                for (let coupon of pack) {
                    isNotExpired = isNotExpired && await isCouponNotExpired(coupon.coupon_id);
                    isPurchasable = isPurchasable && await isItemPurchasable(coupon.coupon_id, user_id, ITEM_TYPE.COUPON);
                }

                console.warn('UPDATE `coupon_tokens` SET `consumer`=' + user_id + ' WHERE `package`=\'' + pack[0].token + '\'; UPDATE `package_tokens` SET `consumer`=\' + user_id + \' WHERE `package`=\'' + pack[0].token + '\';');

                if (isNotExpired && isPurchasable) {
                    result = {
                        error: false,
                        token: pack[0].token,
                        query: 'UPDATE `coupon_tokens` SET `consumer`=' + user_id + ' WHERE `package`=\'' + pack[0].token + '\'; UPDATE `package_tokens` SET `consumer`=' + user_id + ' WHERE `token`=\'' + pack[0].token + '\';'
                    };
                } else {
                    console.log('ERROR in COUPON MANAGER:\nPackage with ID=' + package_id + ' is not purchasable or expired');
                    result = {error: true, code: HttpStatus.BAD_REQUEST, message: 'Package not purchasable or expired'};
                }
            } else {
                // return error no pack found
                console.error('ERROR in COUPON-MANAGER:');
                console.error('USER=' + user_id + ' asked for buying either an unknown package or an out of stock package with ID=' + package_id);
                result = {
                    error: true,
                    code: HttpStatus.BAD_REQUEST,
                    message: 'Either the package is unknown or it is out of stock'
                };
            }
        }

    } catch (e) {
        console.warn('ERROR in COUPON-MANAGER somewhere when checking if package with ID=' + package_id + ' is expired/purchasable:');
        console.error(e);
        result = {
            error: true,
            code: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Error somewhere when creating the query update for the coupon with id ' + package_id
        };
    }

    return result;
};
const isCouponNotExpired = (coupon_id) => {
    return new Promise((resolve, reject) => {
        Coupon.findOne({
            attributes: ['valid_until'],
            where: {id: coupon_id}
        })
            .then(coupon => {
                // If the coupon exists, it check if is expired or not.
                // If the coupon is not found, it returns true (such as expired)
                const result = coupon !== null
                    ? (coupon.get('valid_until') >= Date.now() || coupon.get('valid_until') === null)
                    : false;

                resolve(result);
            })
            .catch(err => {
                console.log(err);
                reject(err);
            })
    });
};
const isItemPurchasable = async (coupon_id, user_id, type = ITEM_TYPE.COUPON) => {
    // It returns id, purchasable, quantity, available and buyed
    let queryResult;
    let query = type === ITEM_TYPE.COUPON
        // Coupon query
        ? 'SELECT id, purchasable, COUNT(*) AS quantity, COUNT(CASE WHEN CouponTokens.consumer IS NULL THEN 1 END) AS available, ' +
        'COUNT(CASE WHEN consumer = $1 THEN 1 END) AS bought FROM coupons AS Coupon JOIN coupon_tokens AS CouponTokens ' +
        'ON Coupon.id = CouponTokens.coupon_id WHERE id = $2 GROUP BY id'

        // Package query
        : 'SELECT PackageTokens.package_id, Coupon.purchasable, COUNT(DISTINCT PackageTokens.token) AS quantity, ' +
        'COUNT(DISTINCT CASE WHEN PackageTokens.consumer IS NULL THEN 1 END) AS available, ' +
        'COUNT(DISTINCT CASE WHEN PackageTokens.consumer = $1 THEN 1 END) AS bought ' +
        'FROM package_tokens AS PackageTokens JOIN coupons AS Coupon ON PackageTokens.package_id = Coupon.id ' +
        'JOIN coupon_tokens AS CouponTokens ON CouponTokens.package = PackageTokens.token ' +
        'WHERE PackageTokens.package_id = $2';

    queryResult = (await Sequelize.query(query, {
        bind: [user_id, coupon_id],
        type: Sequelize.QueryTypes.SELECT
    }, {model: Coupon}))[0];

    return queryResult.purchasable === null // null == infinite availability
        ? queryResult.available > 0
        : queryResult.available > 0 && queryResult.bought < queryResult.purchasable;
};
const isVerifierAuthorized = async (producer_id, verifier_id) => {
    if (producer_id === verifier_id){
        return new Promise((resolve, reject) => {
            resolve(producer_id === verifier_id)
        })
    } else {
        return new Promise((resolve, reject) => {
            Verifier.findOne({
                where: {
                    [Op.and]: [
                        {producer: producer_id}, {verifier: verifier_id}
                    ]
                }
            })
                .then(result => { // If result !== null, there is not a couple producer/verifier ==> verifier not authorized
                    resolve(result !== null);
                })
                .catch(err => {
                    console.log(err);
                    reject(err);
                })
        });
    }
};
const insertCoupon = (coupon, owner) => {
    return new Promise((resolve, reject) => {
        Coupon.create({
            title: coupon.title,
            description: coupon.description,
            image: coupon.image,
            timestamp: Number(Date.now()),
            price: coupon.price,
            visible_from: coupon.visible_from === null ? null : Number(coupon.visible_from) === 0?
                            null:  Number(coupon.visible_from),
            valid_from: Number(coupon.valid_from),
            valid_until: coupon.valid_until === null ? null : Number(coupon.valid_until) === 0 ?
                        null: Number(coupon.valid_until),
            purchasable: coupon.purchasable,
            constraints: coupon.constraints,
            type: coupon.type,
            owner: owner,
        })
            .then(newCoupon => {
                resolve(newCoupon);
            })
            .catch(err => {
                console.log(err);
                reject(err);
            })
    });
};
const lockTables = () => {
    return new Promise((resolve, reject) => {
        Sequelize.query(
            'LOCK TABLE `coupons` AS `Coupon` WRITE, `coupon_tokens` AS `CouponTokens` WRITE, `package_tokens` AS `PackageTokens` WRITE')
            .then(lock => {
                console.log('LOCK SUCCESSFUL');
                resolve(true);
            })
            .catch(err => {
                console.log(err);
                resolve(false);
            })
    });
};
const unlockTables = () => {
    return new Promise((resolve, reject) => {
        Sequelize.query(
            'UNLOCK TABLES')
            .then(lock => {
                resolve(true);
            })
            .catch(err => {
                console.log(err);
                resolve(false);
            })
    });
};
const getBrokerCoupons = (req, res) => {
    Sequelize.query(
        'SELECT id, title, description, image, price, visible_from, valid_from, valid_until, purchasable, constraints, owner, type, \n' +
        '    COUNT(CASE WHEN consumer IS null AND verifier IS null AND package IS null  THEN 1 END) AS quantity\n' +
        '    FROM coupons JOIN coupon_tokens ON coupons.id = coupon_tokens.coupon_id  JOIN coupon_broker ON\n' +
        '        coupon_broker.coupon_id = coupons.id WHERE coupon_broker.broker_id = $1 AND ' +
        '(coupon_tokens.consumer IS null AND coupon_tokens.verifier IS null AND coupon_tokens.package IS null)' +
        '    GROUP BY id',
        {bind: [req.user.id], type: Sequelize.QueryTypes.SELECT},
        {model: Coupon})
        .then(coupons => {
            coupons = coupons.filter(coupon => coupon.quantity != 0);

            if (coupons.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send({});
            }
            return res.status(HttpStatus.OK).send(coupons);
        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the broker coupons '
            })
        })
};
const getFromIdIntern = async function (id) {
    return new Promise(resolve => {
        Coupon.findOne({
            where: {id: id}
        })
            .then(coupon => {
                if (coupon === null) {
                    return {
                        error: 'No coupon found with the given id.',
                        coupon_id: parseInt(id),
                    }
                }

                resolve(coupon)
            })
            .catch(err => {
                console.log(err);
                return {
                    error: 'No coupon found with the given id.',
                    coupon_id: parseInt(id),
                }
            });
    })
};
const formatCoupon = (coupon) => {
    let CouponTokens = {
        token: coupon.token,
        coupon_id: coupon.coupon_id,
        consumer: coupon.consumer,
        package: coupon.package,
        verifier: coupon.verifier
    };

    delete coupon['token'];
    delete coupon['coupon_id'];
    delete coupon['consumer'];
    delete coupon['package'];
    delete coupon['verifier'];

    coupon.token = CouponTokens;

    return coupon;
};

// return brokers username list associated at coupon
const getBrokerFromCouponId = async (req, res) => {
    let couponBrokers, brokerTmp, brokers = [];

    try {
        couponBrokers = await CouponsBrokers.findAll({
            where: {coupon_id: req.params.id}
        });

        if(!couponBrokers) {
            return res.status(HttpStatus.NO_CONTENT).send({
                error: 'There are no authorization given to brokers for this coupon.',
                coupon_id: parseInt(req.params.coupon_id)
            })
        }

        for(const el of couponBrokers) {
            brokerTmp = await User.findOne({where: {id: el.dataValues.broker_id}});

            if(!brokerTmp) {
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                    error: true,
                    message: `Cannot retrieve a user with id ${el.dataValues.id}`
                })
            }

            brokers.push(brokerTmp);
        }

        return res.status(HttpStatus.OK).send(brokers);
    } catch (err) {
        console.log(err);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'Cannot GET the brokers authorized to the given coupon.'
        })
    }
};



const formatArray = (arrayCoupons) => {
    const arrayReduce = getUnique(arrayCoupons, 'coupon_id')
    let arrayResult = [];
    let arrayResultFull = [];
    for (let i = 0; i<arrayReduce.length; i++) {

        for (let j = 0; j<arrayCoupons.length; j++){
            if (arrayReduce[i].coupon_id ===arrayCoupons[j].coupon_id ) {
                arrayResult.push(arrayCoupons[j]);
                }
        }
        arrayResultFull.push(arrayResult)

        arrayResult = [];
    }
    //console.log('arrayResultFull', arrayResultFull)
    return arrayResultFull;
}

function getUnique(arr, comp) {

    const unique = arr
        .map(e => e[comp])

        // store the keys of the unique objects
        .map((e, i, final) => final.indexOf(e) === i && i)

        // eliminate the dead keys & store unique objects
        .filter(e => arr[e]).map(e => arr[e]);

    return unique;
}


const isCouponFromToken =  (req, res) => {
    const token = req.params.token
    CouponToken.findOne({
        where: {token: token}
    }).then( tk => {
        if (tk === null) {
            return res.status(HttpStatus.OK).send({
                error: true,
                token: token,
                message: 'This token don\'t is a coupon.',
            })
        }
        return res.status(HttpStatus.OK).send({
            error: false,
            message: 'this token is an coupon',
            token: token
        })

    }).catch(err => {
        console.log(err);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: "An error occurred while finding the token"
        })
    });
};

const getProducerCouponsOffline = (req, res) => {
    Sequelize.query(
        'SELECT id, title, description, image, price, visible_from, valid_from, valid_until, purchasable, constraints, owner, type, ' +
        'COUNT(CASE WHEN consumer = 5 AND verifier IS null AND package IS null THEN 1 END) AS buyed, COUNT(*) AS quantity ' +
        'FROM coupons JOIN coupon_tokens ON coupons.id = coupon_tokens.coupon_id WHERE owner = :id ' +
        'AND visible_from IS null AND coupon_tokens.package is null AND (coupon_tokens.consumer is null OR  coupon_tokens.consumer = 5) ' +
        'GROUP BY id',
        {replacements: {id:req.user.id}, type: Sequelize.QueryTypes.SELECT},
        {model: Coupon})
        .then(coupons => {
            if (coupons.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send({});
            }
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

const returnRedeemCouponList = ( token, verifier) =>
        {
            //console.log( 'returnRedeemCouponList', returnRedeemCouponList)
            return new Promise((resolve, reject) =>{

                CouponToken.findAll({
                    include: [{model: Coupon, required: true}],
                    where: {
                        [Op.and]: [
                            {package: token}, {consumer: {[Op.not]: null}},  {verifier: null}
                        ]
                    }
                }).then( async resultPackage =>{
                    //console.log('resultPackage', resultPackage)

                    if (resultPackage.length === 0) {
                        //console.log('resultPackage 0', resultPackage)

                       resolve(false)
                    }

                    else {
                        let couponsArray = [];
                        //let count = 0;
                        for (const cp of resultPackage) {
                            //console.log('count', count++)
                            //trovo l'owner del coupon
                            const producer_coupon_id = cp.dataValues.Coupons[0].dataValues.owner;
                            const isVerifier = await isVerifierAuthorized(producer_coupon_id, verifier)
                            //console.log('isVerifier', isVerifier)

                            if (isVerifier) {
                                couponsArray.push(cp.dataValues)
                            }
                        }
                        if (couponsArray.length === 1) {

                            resolve({
                                coupons: formatArray(couponsArray)
                            })
                        }
                        if (couponsArray.length === 0) {
                            resolve({
                                redeemed: false,
                                coupons: null
                            })
                        }
                        if (couponsArray.length > 1) {
                            //console.log('couponsArray > 1', couponsArray)

                            resolve({
                                coupons: formatArray(couponsArray)
                            })
                        }
                    }
                }).catch(err => {
                    reject(err);

                })
            })
        }

const getPackageBought = async function (id) {

    return new Promise((resolve, reject) => {
        PackageTokens.findOne(
            {
                where: {
                    [Op.and]: [
                        {package_id: id},
                        {consumer: {[Op.gte]: 1} }
                    ]
                }
            }
        ).then( pack => {
                resolve(pack);
            })
            .catch(err => {
                console.log("This package token don't available.");
                console.log(err);

                reject(err);
            })
    });
};

const getCouponBought = async function (id) {

    return new Promise((resolve, reject) => {
        CouponToken.findOne(
            {
                where: {
                    [Op.and]: [
                        {coupon_id: id},
                        {consumer: {[Op.gte]: 1} }
                    ]
                }
            }
        ).then( cp => {
            resolve(cp);
        })
            .catch(err => {
                console.log("This coupon token don't available.");
                console.log(err);

                reject(err);
            })
    });
};

const preBuy = async function (req, res) {
    const time = 100000  // 5 minuti sono 300000
    console.log('richiesta preBuy', req.body.coupon_list)
    console.log('richiesta preBuy fatta da:', req.user.id)


    let coupon_id = req.body.coupon_list[0].id // il coupon che modifico
    let user_id = req.user.id     // l'user del db originale è 3 (consumer = 3)
    let quantity = req.body.coupon_list[0].quantity
    // TODO devo controllare che non è venduto
    try {
            const pending_remove = await CouponTokenManager.removePendingCouponToken(user_id, coupon_id, quantity)
            console.log('pending remove preBuy', pending_remove)
            const pending = await CouponTokenManager.pendingCouponToken(user_id, coupon_id, quantity)
            console.log('pending activate preBuy', pending)
            let result
            if(pending.length == 0) {
                return res.status(HttpStatus.OK).send({
                    error: true,
                    message: 'This coupon is unavailable'
                });
            } else {
                await sleep(time)
                result = await CouponTokenManager.removePendingCouponToken(user_id, coupon_id, quantity)
                return res.status(HttpStatus.OK).send({
                    error: true,
                    message: 'Time expired',
                    time: time
                });
            }


            console.log('pending', pending)


    } catch (e) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'Internal server error',
        });
    }

};

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}


const removePreBuy = async function (req, res) {

    console.log('richiesta rimozione removePreBuy', req.body.coupon_list)
    console.log('richiesta rimozione removePreBuy fatta da:', req.user.id)

    let coupon_id = req.body.coupon_list[0].id //il coupon che modifico
    let user_id = req.user.id //l'user del coupon del db è 3 (consumer = 3)
    let consumer = null
    const quantity = req.body.coupon_list[0].quantity
    // TODO devo controllare che non è venduto
    if (!consumer) {
        const pending_remove = await CouponTokenManager.removePendingCouponToken(user_id, coupon_id, quantity)
        console.log('pending remove removePreBuy', pending_remove)
        return res.status(HttpStatus.OK).send({
            error: false,
            message: 'Remove pending'
        });
    }
};

module.exports = {
    createCoupon,
    getFromId,
    getByToken,
    getProducerCoupons,
    getBrokerCoupons,
    getPurchasedCoupons,
    getPurchasedCouponsById,
    getAvailableCoupons,
    getAvailableCouponsByCategory,
    getAvailableByTextAndCatId,
    getProducerCouponsOffline,
    buyCoupons,
    editCoupon,
    deleteCoupon,
    importOfflineCoupon,
    importOfflinePackage,
    redeemCoupon,
    addImage,
    getFromIdIntern,
    getBrokerFromCouponId,
    isCouponFromToken,
    getPackageBuyed: getPackageBought,
    getCouponBought,
    preBuy,
    removePreBuy

};

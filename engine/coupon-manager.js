'use strict';

const Coupon = require('../models/index').Coupon;
const CouponToken = require('../models/index').CouponToken;
const CouponsCategories = require('../models/index').CouponsCategories;
const Verifier = require('../models/index').Verifier;
const Sequelize = require('../models/index').sequelize;
const Op = require('../models/index').Sequelize.Op;
const CouponBrokerManager = require('./coupon-broker-manager');
const CategoriesManager = require('./categories-manager');
const Package_id = require('../models/index').Package_id;
const CouponTokenManager = require('./coupon-token-manager');
const OrdersManager = require('./orders-manager');
const PackageManager = require('./package-manager');

const HttpStatus = require('http-status-codes');
const fs = require('file-system');
const path = require('path');
const crypto = require('crypto');
const _ = require('lodash');

/** Exported REST functions **/

const createCoupon = async (req, res) => {
    const data = req.body;
    let result;
    console.log('data', data)
    try {

            result = await insertCoupon(data, req.user.id);

    } catch (e) {
        console.log(e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'Error inserting the new coupon.',
        });
    }

    if (result) { // If the coupon has been created
        // console.log('data.broker_id',data.brokers)
        // console.log('result',result)
        if (data.categories.length > 0) {
            // console.log('data.categoriesss',data.categories)

            for (let i = 0; i < data.categories.length; i++) {
                try {
                    await CategoriesManager.assignCategory({
                        coupon_id: result.id,
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
        if(data.brokers) {
            for (let i = 0; i < data.brokers.length; i++) {
                try {
                    const newBroker = await CouponBrokerManager
                        .insertCouponBroker(result.get('id'), data.brokers[i].id);
                } catch (e) {
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                        error: true,
                        message: 'Error creating the broker.',
                        brokens_created: (i + 1)
                    });
                }


            }
        }
        for (let i = 0; i < data.quantity; i++) {

            let newToken;

            console.log('result' , result)
            try {
                if(result.type == 0) {
                    const token = generateUniqueToken(data.title, req.user.password);
                    newToken = await CouponTokenManager.insertCouponToken(result.get('id'), token);
                } else {

                        try {
                            for(let j =0; j < data.coupons.length; j++) {
                                const tokenPackage = await PackageManager.generateUniqueToken(data.title, req.user.password)
                                await PackageManager.insertTokenPackage(result.get('id'), tokenPackage)
                                const couponToken = await CouponTokenManager.getTokenByIdCoupon(data.coupons[j].id)
                                console.log('tokennnnnnn', couponToken, 'tokenPackageeeeeee', tokenPackage)
                                newToken = await CouponTokenManager.updateCouponToken( couponToken.dataValues.token, data.coupons[j].id,null, tokenPackage, null)
                            }
                            } catch (e) {
                            console.log('error insert package into coupons_token', e)
                        }

                }
            } catch (e) {
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                    error: true,
                    message: 'Error creating the tokens.',
                    tokens_created: (i + 1)
                });
            }


            if (!newToken) {
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                    error: true,
                    message: 'Error creating the tokens.',
                    tokens_created: (i + 1)
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
const getProducerCoupons = (req, res) => {
    Sequelize.query(
        'SELECT id, title, description, image, price, visible_from, valid_from, valid_until, purchasable, constraints, owner, ' +
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
const getPurchasedCoupons = (req, res) => {
    Coupon.findAll({
        include: [{model: CouponToken, required: true, where: {consumer: req.user.id}}],
    })
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
                message: 'Error retrieving purchased coupons'
            })
        });
};
const getPurchasedCouponsById = (req, res) => {
    Coupon.findAll({
        include: [{
            model: CouponToken,
            required: true,
            where: {consumer: req.user.id, coupon_id: req.params.coupon_id}
        }],
        attributes: {include: [[Sequelize.fn('COUNT', Sequelize.col('coupon_id')), 'bought']]}
    })
        .then(coupons => {
            if (coupons.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send({});
            }

            return res.status(HttpStatus.OK).send({
                coupon_id: req.params.coupon_id,
                bought: coupons[0].dataValues.bought
            });
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
            error: 'Cannot GET available coupons by category ID'
        })
    }
};

// The application could fail in every point, revert the buy in that case
const buyCoupons = async (req, res) => {

    const coupon_list = req.body.coupon_list;
    let query = 'START TRANSACTION; ';
    let tokenToExclude = [];
    let buyCouponQuery;
    let buyQueryResult;
    let order_id;

    console.log(coupon_list);

    const lock = await lockTables();

    if (!lock) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            call: 'buyCoupons',
            message: 'An error occurred while finalizing the purchase'
        });
    }

    console.log(coupon_list.length);

    for (let i = 0; i < coupon_list.length; i++) {
        try {
            tokenToExclude = [];

            for (let j = 0; j < coupon_list[i].quantity; j++) {
                buyQueryResult = await getBuyCouponQuery(coupon_list[i].id, req.user.id, tokenToExclude);
                buyCouponQuery = buyQueryResult[0];
                tokenToExclude.push(buyQueryResult[1]);

                if (buyCouponQuery !== null) {
                    query += buyCouponQuery;
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
    console.log(query);

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
            order_id = await OrdersManager.createOrderFromCart(req.user.id, coupon_list);

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

const editCoupon = (req, res) => {
    const data = req.body;
    let valid_until = data.valid_until === null ? null : Number(data.valid_until);
    let visible_from = data.visible_from === null ? null : Number(data.visible_from);
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
    }, {
        where: {
            [Op.and]: [
                {owner: req.user.id},
                {id: data.id}
            ]
        }
    })
        .then(couponUpdated => {
            // console.log('couponUpdated', couponUpdated);
            if (couponUpdated[0] === 0) {
                return res.status(HttpStatus.NO_CONTENT).json({
                    updated: false,
                    coupon_id: data.id,
                    message: "This coupon doesn't exist"
                })
            }
            else {
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

const deleteCoupon = (req, res) => {
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
};

const importOfflineCoupon = (req, res) => {
    const data = req.body;

    CouponToken.findOne({
        where: {


            [Op.and]: [
                {consumer: {[Op.is]: null}},
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
                .then(update => {
                    if (update) {
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

const redeemCoupon = (req, res) => {
    const data = req.body;
    const verifier_id = req.user.id;

    console.log(data.token);

    // Join between CouponToken and Coupon where token = givenToken and consumer is not null
    CouponToken.findOne({
        include: [{model: Coupon, required: true}],
        where: {
            [Op.and]: [
                {token: data.token}, {consumer: {[Op.not]: null}}, {verifier: {[Op.is]: null}}
            ]
        }
    })
        .then(result => {
            console.log(result);

            if (!result) {
                return res.status(HttpStatus.BAD_REQUEST).send({
                    error: true,
                    message: 'Either the coupon is not found, unsold or already redeemed.',
                })
            }

            const couponTkn = {
                token: data.token,
                coupon_id: result.dataValues.coupon_id,
                consumer: result.dataValues.consumer
            };
            const producer_id = result.dataValues.Coupons[0].dataValues.owner;

            isVerifierAuthorized(producer_id, verifier_id)
                .then(authorization => {
                    if (authorization) { // If the verifier is authorized, it redeems the coupon
                        console.log('I can redeem the coupon');

                        CouponTokenManager.updateCouponToken(couponTkn.token, couponTkn.coupon_id, couponTkn.consumer, verifier_id)
                            .then(update => {
                                console.log(update);
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
    console.log(req);

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

    // return res.send({cacca: 'si'});
};

/** Private methods **/

const filterCouponsByText = (coupons, text) => {
    return coupons.filter(coupon => coupon.title.toLowerCase().includes(text) || coupon.description.toLowerCase().includes(text));
};
const availableCoupons = async () => {
    return await Sequelize.query(
        'SELECT id, title, description, image, price, visible_from, valid_from, valid_until, purchasable, constraints, owner, ' +
        ' COUNT(*) AS quantity FROM coupon_tokens JOIN coupons ' +
        'ON coupons.id = coupon_tokens.coupon_id WHERE consumer IS null AND coupons.visible_from IS NOT null ' +
        'AND coupons.visible_from <= CURRENT_TIMESTAMP  AND coupons.valid_from <= CURRENT_TIMESTAMP ' +
        'AND (coupons.valid_until >= CURRENT_TIMESTAMP  OR coupons.valid_until IS null) GROUP BY coupons.id',
        {type: Sequelize.QueryTypes.SELECT},
        {model: Coupon}
    );
};
const availableCouponsByCategoryId = async (category_id) => {
    let coupons, ids, filtered;

    coupons = await availableCoupons();

    if(category_id > 0) {
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
const getBuyCouponQuery = async (coupon_id, user_id, tokenExcluded = []) => {

    let lastPieceOfQuery = tokenExcluded.length === 0 ? '' : 'AND token NOT IN ' + formatNotIn(tokenExcluded);

    let isNotExpired;
    let isPurchasable;

    try {
        isNotExpired = await isCouponNotExpired(coupon_id);
        isPurchasable = await isCouponPurchasable(coupon_id, user_id);
    } catch (err) {
        console.log('ERROR in COUPON-MANAGER,\nwhen checking if coupon with ID=' + coupon_id + ' is expired/purchasable:');
        console.log(err);
        return null;
    }

    // If the coupon is not expired and is purchasable
    return new Promise((resolve, reject) => {
        if (isNotExpired && isPurchasable) {

            Sequelize.query('SELECT * FROM `coupon_tokens` AS `CouponTokens` WHERE consumer IS NULL ' +
                'AND coupon_id = :coupon_id ' + lastPieceOfQuery + 'LIMIT 1',
                {replacements: {coupon_id: coupon_id}, type: Sequelize.QueryTypes.SELECT},
                {model: CouponToken}
            )
                .then(coupon => {
                    if (coupon === null) {
                        console.log('ERROR in COUPON-MANAGER:');
                        console.log('USER=' + user_id + ' asked for buying an unknown coupon with ID=' + coupon_id);
                        reject([HttpStatus.BAD_REQUEST, null]);
                    }

                    resolve(['UPDATE `coupon_tokens` SET `consumer`=' + user_id + ' WHERE `coupon_id`=' + coupon_id + ' AND `token`="' + coupon[0].token + '"; ', coupon[0].token]);
                })
                .catch(err => {
                    console.log('ERROR in COUPON-MANAGER,\nwhen retrieving a token for the coupon with ID=' + coupon_id + ':');
                    console.log(err);
                    reject([HttpStatus.INTERNAL_SERVER_ERROR, null]);
                })
        } else {
            console.log('ERROR in COUPON MANAGER:\nCoupon with ID=' + coupon_id + ' is not purchasable or expired');
            reject([HttpStatus.BAD_REQUEST, null]);
        }
    });
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
const isCouponPurchasable = (coupon_id, user_id) => {
    // It returns id, purchasable, quantity, available and buyed

    return new Promise((resolve, reject) => {

        Sequelize.query('SELECT id, purchasable, COUNT(*) AS quantity, ' +
            'COUNT(CASE WHEN consumer IS NULL THEN 1 END) AS availables, ' +
            'COUNT(CASE WHEN consumer = $1 THEN 1 END) AS bought ' +
            'FROM `coupons` AS `Coupon` JOIN `coupon_tokens` AS `CouponTokens` ON Coupon.id = CouponTokens.coupon_id WHERE id = $2 GROUP BY id',
            {bind: [user_id, coupon_id], type: Sequelize.QueryTypes.SELECT},
            {model: Coupon}
        )
            .then(infos => {
                const queryResult = infos[0];

                // If purchasable is not null, then it checks only for availability, else it checks if you can buy the coupon
                const result = queryResult.purchasable === null // null == infinite availability
                    ? queryResult.availables > 0
                    : queryResult.availables > 0 && queryResult.bought < queryResult.purchasable;
                resolve(result);
            })
            .catch(err => {
                console.log(err);
                reject(err); // Error == couponNotPurchasable
            })
    });
};
const isVerifierAuthorized = (producer_id, verifier_id) => {
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
};
const insertCoupon = (coupon, owner) => {
    console.log('insertCoupon')

    return new Promise((resolve, reject) => {
        Coupon.create({
            title: coupon.title,
            description: coupon.description,
            image: coupon.image,
            timestamp: Number(Date.now()),
            price: coupon.price,
            visible_from: coupon.visible_from === null ? null : Number(coupon.visible_from),
            valid_from: Number(coupon.valid_from),
            valid_until: coupon.valid_until === null ? null : Number(coupon.valid_until),
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
            'LOCK TABLE `coupons` AS `Coupon` WRITE, `coupon_tokens` AS `CouponTokens` WRITE')
            .then(lock => {
                console.log(lock);
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
        'SELECT id, title, description, image, price, visible_from, valid_from, valid_until, purchasable, constraints, owner, \n' +
        '    COUNT(CASE WHEN consumer IS null AND verifier IS null AND package IS null  THEN 1 END) AS quantity\n' +
        '    FROM coupons JOIN coupon_tokens ON coupons.id = coupon_tokens.coupon_id  JOIN coupon_broker ON\n' +
        '        coupon_broker.coupon_id = coupons.id WHERE coupon_broker.broker_id = $1 AND ' +
        '(coupon_tokens.consumer IS null AND coupon_tokens.verifier IS null AND coupon_tokens.package IS null)' +
        '    GROUP BY id',
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
                message: 'Cannot get the broker coupons '
            })
        })
};


const getFromIdIntern = async function ( id) {

   return new Promise (resolve => {
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

module.exports = {
    createCoupon,
    getFromId,
    getProducerCoupons,
    getBrokerCoupons,
    getPurchasedCoupons,
    getPurchasedCouponsById,
    getAvailableCoupons,
    getAvailableCouponsByCategory,
    getAvailableByTextAndCatId,
    buyCoupons,
    editCoupon,
    deleteCoupon,
    importOfflineCoupon,
    redeemCoupon,
    addImage,
    getFromIdIntern
};
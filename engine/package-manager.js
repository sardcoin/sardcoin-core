'use strict';

const PackageTokens = require('../models/index').PackageTokens;
const CouponToken = require('../models/index').CouponToken;
const Coupon = require('../models/index').Coupon;
const CouponsCategories = require('../models/index').CouponsCategories;
const Verifier = require('../models/index').Verifier;
const Sequelize = require('../models/index').sequelize;
const Op = require('../models/index').Sequelize.Op;
const CouponManager = require('./coupon-manager');
const CouponTokenManager = require('./coupon-token-manager');
const OrdersManager = require('./orders-manager');
const HttpStatus = require('http-status-codes');
const fs = require('file-system');
const path = require('path');
const crypto = require('crypto');
const _ = require('lodash');

/** Exported REST functions **/

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

};

/** Private methods **/

const generateUniqueToken = (title, token) => {

    const min = Math.ceil(1);
    const max = Math.floor(1000000);
    const total = Math.floor(Math.random() * (max - min)) + min;

    return crypto.createHash('sha256').update(title + token + total.toString()).digest('hex').substr(0, 8).toUpperCase();

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
// return all package for broker
const getBrokerPackages = async (req, res) => {
    let result = [];

    Sequelize.query(
        'SELECT coupons.*, COUNT(*) AS quantity, COUNT(CASE WHEN consumer IS NOT NULL THEN 1 END) AS bought\n ' +
        'FROM `package_tokens` JOIN coupons ON package_tokens.package_id = coupons.id\n ' +
        'WHERE owner = $1 ' +
        'GROUP BY package_tokens.package_id',
        {bind: [req.user.id], type: Sequelize.QueryTypes.SELECT},
        {model: Coupon})
        .then(packages => {
            if (packages.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send({});
            }

            return res.status(HttpStatus.OK).send(packages);

        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the distinct packages created'
            })
        })
};
// get coupons from package TODO ADD SEND ERROR MESSAGE
const getCouponsPackage = async (req, res) => {
    let coupons = []
    const id = req.params.package_id;
    const token = await CouponTokenManager.getTokenByIdPackage(id)
    const cpTokens = await CouponTokenManager.getCouponsByTokenPackage(token.dataValues.token)
    for (const cpToken of cpTokens) {
        const id = cpToken.dataValues.coupon_id

        const cp = await CouponManager.getFromIdIntern(id)
        coupons.push(cp.dataValues)
    }
    if (coupons.length === 0) {
        return res.status(HttpStatus.NO_CONTENT).send({
        })
    }
    return res.status(HttpStatus.OK).send({
        coupons_count: coupons.length,
        coupons_array: coupons
    })
};

exports.insertTokenPackage = async (package_id, token) => {
    return new Promise((resolve, reject) => {
        PackageTokens.create({
            token: token,
            package_id: package_id
        })
            .then(newPackage => {
                console.log('\nNEW PACKAGE: ', newPackage.dataValues);
                resolve(newPackage);
            })
            .catch(err => {
                console.log('error inserting the new token package', err);
                reject(err);
            })
    });
};

// unused get complete informations from package
/*const getAllData = async function (packages) {
    let result = []

    for (let pack of packages) {
        let coupons = []
        const categories = await getCategories(pack)
        const token = await CouponTokenManager.getTokenByIdPackage(pack.id)


        const cpTokens = await CouponTokenManager.getCouponsByTokenPackage(token.dataValues.token)
        console.log('ccpToken', cpTokens)

        for (const cpToken of cpTokens) {
            let p = {coupon: null, token: null}

            const id = cpToken.dataValues.coupon_id

            const cp = await CouponManager.getFromIdIntern(id)
            p.coupon = cp.dataValues
            console.log('cpcpcpcpcpcpcp', cp)

            p.token = cpToken.dataValues
            coupons.push(p)
        }

        console.log('coupons getAllData', coupons)
        result.push({package: pack, categories: categories, coupons: coupons})
    }
    console.log('getAllData', result)
    return result;


};*/

const getCategories = async function (pack) {

    return new Promise((resolve, reject) => {
        CouponsCategories.findAll({
            attributes: ['category_id'],
            where: {
                coupon_id: pack.id
            }
        }).then(categories => {
            resolve(categories)

        })
    })

};

module.exports = {
    generateUniqueToken,
    getBrokerPackages,
    addImage,
    getCategories,
    getCouponsPackage
};
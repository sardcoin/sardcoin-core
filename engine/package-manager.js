'use strict';

const Package_tokens = require('../models/index').Package_tokens;
const CouponToken = require('../models/index').CouponToken;
const Coupon = require('../models/index').Coupon;
const CouponsCategories = require('../models/index').CouponsCategories;
const Verifier = require('../models/index').Verifier;
const Sequelize = require('../models/index').sequelize;
const Op = require('../models/index').Sequelize.Op;
const CategoriesPackageManager = require('./categories-packages-manager');
const PackagesCategories = require('../models/index').PackagesCategories;
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

    // return res.send({cacca: 'si'});
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

const getBrokerPackages = async(req, res) => {
    let result = []
    Sequelize.query(
        'SELECT id, title, description, image, price, visible_from, valid_from, valid_until, purchasable, constraints, owner, ' +
        'COUNT(CASE WHEN consumer IS NOT null AND verifier IS null AND package.id=coupon_tokens.package THEN 1 END) ' +
        'AS buyed, COUNT(CASE WHEN verifier IS null AND package.id=coupon_tokens.package THEN 1 END) AS quantity ' +
        'FROM package JOIN coupon_tokens ON package.id = coupon_tokens.package WHERE owner = $1 ' +
        'GROUP BY id',
        {bind: [req.user.id], type: Sequelize.QueryTypes.SELECT},
        {model: Package})
        .then(packages => {
            console.log('packages', packages)

            if (packages.length === 0) {
                return res.status(HttpStatus.NO_CONTENT).send({});
            } else {
                for (let pack of packages) {
                    PackagesCategories.findAll({
                        attributes: ['category_id'],
                        where: {
                            package_id: pack.id
                        }
                    }).then(async categories =>{
                        console.log('categories',await categories)

                        const coupons = await CouponTokenManager.getCouponsByIdPackage(pack.id)
                        result.push({package: pack, categories: categories, coupons: coupons})
                        return res.status(HttpStatus.OK).send(result);
                    })
                }
                console.log('result', result)
            }

        })
        .catch(err => {
            console.log(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot get the distinct coupons created'
            })
        })
};





const insertTokenPackage = (package_id, token) => {
    console.log('insertPackage')

    return new Promise((resolve, reject) => {
        Package_tokens.create({
            token: token,
            package_id: package_id
        })
            .then(newPackage => {
                resolve(newPackage);
            })
            .catch(err => {
                console.log('error insert',err);
                reject(err);
            })
    });
};





module.exports = {
    generateUniqueToken,
    getBrokerPackages,
    addImage,
    insertTokenPackage
};
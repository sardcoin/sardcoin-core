'use strict';

const PackageTokens = require('../models/index').PackageTokens;
const Coupon = require('../models/index').Coupon;
const Sequelize = require('../models/index').sequelize;
const CouponManager = require('./coupon-manager');
const CouponTokenManager = require('./coupon-token-manager');
const HttpStatus = require('http-status-codes');
const fs = require('file-system');
const path = require('path');
const _ = require('lodash');
// const AM = require('../engine/access-manager');

/** Exported REST functions **/

const addImage = (req, res) => {
    //console.log(req);

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
    //console.log('ididididid', id)
    const token = await CouponTokenManager.getTokenByIdPackage(id)
    //console.log('tokentokentoken', token)
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
                //console.log('\nNEW PACKAGE: ', newPackage.dataValues);
                resolve(newPackage);
            })
            .catch(err => {
                console.log('error inserting the new token package', err);
                reject(err);
            })
    });
};


exports.pendingPackageToken = async function ( user_id, package_id, quantity) {

    //console.log('user pendingCouponToken', user_id)
    //console.log('coupon_id pendingCouponToken', coupon_id)
    //console.log('coupon_id pendingCouponToken', quantity)

    // se c'è già pending allora si azzera e si rifà
    try {
        const result = await Sequelize.query('UPDATE `package_tokens` AS `PackageTokens` SET prepare = :user_id  WHERE  consumer IS NULL ' +
            'AND package_id = :package_id LIMIT :quantity ',
            {replacements: {package_id: package_id, user_id: user_id, quantity: quantity}, type: Sequelize.QueryTypes.UPDATE},
            {model: PackageTokens}
        );

        //console.log('risultato pendingCouponToken', result)
        return result;

    } catch (e) {
        console.log('errore imprevisto', e)
    }
};

exports.removePendingPackageToken = async function ( user_id, package_id, quantity) {

    //console.log('user removePendingCouponToken', user_id)
    //console.log('coupon_id removePendingCouponToken', coupon_id)
    try {
        const result = await Sequelize.query('UPDATE `package_tokens` AS `PackageTokens` SET prepare = null  WHERE  consumer IS NULL ' +
            'AND package_id = :package_id AND prepare = :user_id LIMIT :quantity ',
            {replacements: {package_id: package_id, user_id: user_id, quantity: quantity}, type: Sequelize.QueryTypes.UPDATE},
            {model: PackageTokens}
        );

        //console.log('risultato removePendingCouponToken', result)
        return result;

    } catch (e) {
        console.log('errore imprevisto', e)
    }
};

exports.isPackagePendening = async function ( user_id, package_id, quantity) {


    //console.log('user isCouponsPendening', user_id)
    //console.log('coupon_id isCouponsPendening', coupon_id)
    try {
        const result = await  Sequelize.query(
            'SELECT * ' +
            'FROM package_tokens WHERE package_id = :package_id AND consumer IS null AND prepare = :user_id',
            {replacements: {package_id: package_id, user_id: user_id }, type: Sequelize.QueryTypes.SELECT},
            {model: PackageTokens}
        );
        // console.log('risultato isCouponsPendening', result)

        if (result.length == quantity) {
            return true
        } else {

            return false
        }
    } catch (e) {
        console.log("Coupon don't  correct prepared", e)
        return undefined
    }
};



module.exports = {
    getBrokerPackages,
    addImage,
    getCouponsPackage
};

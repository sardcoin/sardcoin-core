'use strict';

const _ = require ('lodash');

const env = process.env.NODE_ENV || 'development';
const config = require('../config/config');

const HttpStatus = require('http-status-codes');
const AccManager = require('./access-manager');
const Request = require('request-promise');
const Users = require('../models/index').User;
const Coupons = require('../models/index').Coupon;
const CouponToken = require('../models/index').CouponToken;
const BlockchainUrl = config[env]['blockchainUrl'];


async function blockchainInterface(method, assets, body = null, params = null) {
    let result;
    let options;

    if (params) {
        options = {
            method: method,
            uri: BlockchainUrl + assets + '/' + params,
            body: body || {},
            json: true
        };
    } else {
        options = {
            method: method,
            uri: BlockchainUrl + assets + '/',
            body: body || {},
            json: true
        };
    }

    try {
        result = await Request(options);
        return result;
    } catch (err) {
        console.error(err);
        throw new Error('Blockchain Interface');
    }
}

async function createBlockchainUser(user_id, user_type) {

    let body;
    let result;
    let type;

    if (user_id && user_type) {
        body = {
            "$class": "eu.sardcoin.participants.Person",
            "id": user_id,
            "reputation": 10000
        };

        result = await blockchainInterface('POST', 'Person', body);

        if (result) {
            switch (parseInt(user_type)) {
                case 0:
                // Admin non esiste in blockchain
                case 1:
                    type = 'Producer';
                    break;
                case 2:
                    type = 'Consumer';
                    break;
                case 3:
                    type = 'Verifier';
                    break;
                case 4:
                    type = 'Broker';
                    break;
                default:
                    break;
            }
            body = {
                "$class": "eu.sardcoin.participants." + type,
                "id": user_id,
                "p": "eu.sardcoin.participants.Person#" + user_id
            };
            result = await blockchainInterface('POST', type, body);
            if (result) {
                console.log("Creato user #", user_id, " di tipo ", type);
            }
        }
    } else {
        throw new Error('createBlockchainUser - an error occurred when inserting the new user in the blockchain');
    }
}

async function deleteBlockchainUser() {

    let result;

    if (user_id) {
        await blockchainInterface('DELETE', 'Person', null, user_id);
    }
    else {
        throw new Error('deleteBlockchainUser - an error occurred when deleting the user in the blockchain');
    }
}

async function addVerifiers(verifierList, campaignId) {

    let body;
    let result;

    if ((verifierList.length > 0) && campaignId != null) {
        body = {
            "$class": "eu.sardcoin.transactions.AddVerifiers",
            "campaign": "eu.sardcoin.assets.Campaign#" + campaignId,
            "verifiers": verifierList
        };

        result = await blockchainInterface('POST', 'AddVerifiers', body);

    }
    else {
        throw new Error('addVerifiers - an error occurred when adding verifiers at campaign');
    }

}

async function createBlockchainCoupon(coupon, tokensArray) {

    let result;
    let body;
    let verifiers;
    let verifiersForBody = [];
    let min = 60000; //ms
    let delay;

    if (coupon && tokensArray.length !== 0) {

        verifiers = await AccManager.getVerifiersFromProducer(coupon.owner);

        body = {
            "$class": "eu.sardcoin.assets.Campaign",
            "campaignId": coupon.id.toString(),
            "state": "CREATED",
            "title": coupon.title,
            "price": coupon.price,
            "economicValue": 0,
            "creationTime": coupon.timestamp,
            "producer": "eu.sardcoin.participants.Producer#" + coupon.owner,
        };

        // 10 minuti
        if ((coupon.visible_from - coupon.timestamp) < (10 * min)) {
            //console.log("risultato ", coupon.visible_from - coupon.timestamp);
            body = Object.assign(body, {"delay": 0});
        } else {
            delay = (coupon.visible_from - coupon.timestamp) / min;
            //console.log("delay: ", delay);
            body = Object.assign(body, {"delay": delay.toString()});
            //MI CALCOLO LA DIFFERENZA DEI MINUTI
        }

        if (coupon.valid_until !== null) {
            body = Object.assign(body, {"expirationTime": coupon.valid_until});
        }

        if (verifiers.length !== 0) {
            for (let verifier of verifiers) {
                verifiersForBody.push("eu.sardcoin.participants.Verifier#" + verifier);
            }
            body = Object.assign(body, {verifiers: verifiersForBody});
        }

        // if(coupon.constraints !== undefined) {
        //     body = Object.assign(body, {"dateConstraints": [coupon.constraints]});
        // }

        result = await blockchainInterface('POST', 'Campaign', body);

        if (result.state === 'CREATED') {
            let campaignId = result.campaignId;
            body = {
                "$class": "eu.sardcoin.transactions.AddCoupons",
                "campaign": "eu.sardcoin.assets.Campaign#" + campaignId,
                "tokens": tokensArray
            };
            result = await blockchainInterface('POST', 'AddCoupons', body);

            if (result) {
                result = await blockchainInterface('GET', 'Campaign', null, campaignId);
                console.log("Ho creato la seguente campagna :", result);
            }
        }
    }
    else {
        throw new Error('createBlockchainCoupon - an error occurred when inserting the coupon in the blockchain');
    }
}

async function editBlockchainCoupon(edited_coupon) {

    let body;
    let result;
    let datePlaceholder = new Date (3471289201 * 1000);
    let expTime;

    if (edited_coupon) {

        expTime = edited_coupon.valid_until;

        if (edited_coupon.valid_until === null){
            expTime = datePlaceholder;
        }

        body = {
            "$class": "eu.sardcoin.transactions.EditCampaign",
            "campaign": "eu.sardcoin.assets.Campaign#" + edited_coupon.id,
            "title": edited_coupon.title,
            "price": edited_coupon.price,
            "expirationTime": expTime
        };

        result = await blockchainInterface('POST', 'EditCampaign', body);

    } else {
        throw new Error('editBlockchainCoupon - an error occurred when editing the coupon in the blockchain');
    }
}

async function deleteBlockchainCoupon(campaign_id) {

    let body;
    let result;

    if (campaign_id) {

        body = {
            "$class": "eu.sardcoin.transactions.DeleteCampaign",
            "campaign": "eu.sardcoin.assets.Campaign#" + campaign_id,
        };

        result = await blockchainInterface('POST', 'DeleteCampaign', body);

    } else {
        throw new Error('deleteBlockchainCoupon - an error occurred when removing the coupon in the blockchain');
    }
}

async function buyBlockchainCoupon(user_id, order_list) {

    let body;
    let result;

    if (user_id && order_list.length !== 0) {

        for (let order of order_list) {

            body = {
                "$class": "eu.sardcoin.transactions.BuyCoupon",
                "coupon": "eu.sardcoin.assets.Coupon#" + order.token,
                "caller": "eu.sardcoin.participants.Consumer#" + user_id
            };

            result = await blockchainInterface('POST', 'BuyCoupon', body);

            if (result) {
                console.log("Coupon #", order.token, " acquistato regolarmente da consumer ", user_id, " e registrato in blockchain");
            }
        }
    }
    else {
        throw new Error('buyBlockchainCoupon - an error occurred when inserting the coupon in the blockchain');
    }

}

async function redeemBlockchainCoupon(coupon) {

    let body;
    let result;

    if (coupon.token) {

        body = {
            "$class": "eu.sardcoin.transactions.CouponRedemptionRequest",
            "coupon": "eu.sardcoin.assets.Coupon#" + coupon.token
        };

        result = await blockchainInterface('POST', 'CouponRedemptionRequest', body);

        //TODO aggiungere controllo sul verificatore che non è presente nella blockchain e annullare lo stato avaiable del coupon

        body = {
            "$class": "eu.sardcoin.transactions.CouponRedemptionApproval",
            "coupon": "eu.sardcoin.assets.Coupon#" + coupon.token,
            "result": true
        };

        result = await blockchainInterface('POST', 'CouponRedemptionApproval', body);

        console.log("Il coupon#", coupon.token, "è stato verificato con risultato ", result.result);

        return result;
    }
}

const migrateUsersDBtoBlockchain = async (req, res) => {

    let users;
    let user_id;
    let user_type;

    try {
        users = await Users.findAll();

        for (const user of users) {
            user_id = user.dataValues.id;
            user_type = user.dataValues.user_type;
            await createBlockchainUser(user_id, user_type);
        }
        return res.status(HttpStatus.OK).send({message: "DB users migrated successfully"});
    }

    catch (err) {
        console.warn(err);
    }

};

// const migrateCouponsDBtoBlockchain = async (req, res) => {
//
//     let coupons;
//     let coupon_id;
//     let tokenArrayDB;
//     let tokenArray = [];
//
//     try {
//         coupons = await Coupons.findAll();
//
//         for (const coupon of coupons) {
//             //controllo se il coupon non sia privato
//             if (coupon.dataValues.visible_from != null) {
//                 coupon_id = coupon.dataValues.id;
//                 tokenArrayDB = await CouponToken.findAll({
//                     where: {
//                         coupon_id: coupon_id
//                     }
//                 });
//
//                 //console.log("coupon ",coupon.dataValues);
//                 tokenArray = _.map(tokenArrayDB, "dataValues.token") ;
//
//                 await createBlockchainCoupon(coupon.dataValues, tokenArray);
//             }
//         }
//         return res.status(HttpStatus.OK).send({message: "DB coupon migrated successfully"});
//     }
//
//     catch (err) {
//         console.warn(err);
//     }
//
// };


module.exports = {
    createBlockchainUser, deleteBlockchainUser, createBlockchainCoupon, editBlockchainCoupon, redeemBlockchainCoupon,
    deleteBlockchainCoupon, buyBlockchainCoupon, addVerifiers, migrateUsersDBtoBlockchain
};

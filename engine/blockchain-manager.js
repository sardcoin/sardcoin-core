'use strict';

const HttpStatus = require('http-status-codes');
const AccManager = require('./access-manager');
const Request = require('request-promise');

const BlockchainUrl = 'http://localhost:3000/api/';


async function blockchainInterface(method, assets, body = null, params = null) {
    let result;
    let options;

    console.log("body che ricevo ", body);

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


async function createBlockchainUser() {

}

async function editBlockchainUser() {

}

async function deleteBlockchainUser() {

}

async function createBlockchainCoupon(coupon, tokensArray) {

    let result;
    let body;
    let verifiers;
    let verifiersForBody = [];

    if (coupon || tokensArray.length === 0) {

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

async function editBlockchainCoupon(newCoupon, campaignid) {
    if (newCoupon && campaignid) {

    } else {
        throw new Error('editBlockchainCoupon - an error occurred when editing the coupon in the blockchain');
    }
}

async function deleteBlockchainCoupon(coupon, campaignid) {
    try {

    } catch (err) {
        throw new Error('deleteBlockchainCoupon - an error occurred when removing the coupon in the blockchain');
    }
}

async function getBlockchainAvaiableCoupons(user) {

}

async function buyBlockchainCoupon(user_id, order_list) {

    if (user_id && order_list.length !== 0) {
        console.log("STO SCRIVENDO SU BLOCKCHAIN");
    }
    else {
        throw new Error('buyBlockchainCoupon - an error occurred when inserting the coupon in the blockchain');
    }

}


async function getBlockchainCouponById() {

}

async function redeemBlockchainCoupon(coupon) {

    if (coupon) {
        //aggiorno lo stato sulla blockchain
        //se tutto corretto restituisco true
        console.log("STO AGGIORNANDO LO STATO SU BLOCKCHAIN")
        return true;

    } else {
        return false;
    }
}

module.exports = {
    createBlockchainUser, editBlockchainUser, deleteBlockchainUser, createBlockchainCoupon,
    editBlockchainCoupon, redeemBlockchainCoupon, deleteBlockchainCoupon, buyBlockchainCoupon,
    getBlockchainCouponById, getBlockchainAvaiableCoupons
};

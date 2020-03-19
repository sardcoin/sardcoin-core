'use strict';

const HttpStatus = require('http-status-codes');

async function createBlockchainUser() {

}

async function editBlockchainUser() {

}

async function deleteBlockchainUser() {

}

async function createBlockchainCoupon(coupon, tokensArray) {
    //Parametri: Il Coupon ed il numero di coupon da inserire
    //verifica i parametri inseriti e
    //inserisci il coupon nella blockchain

    console.log("coupon ", coupon, "tokenArray ", tokensArray.length);

    if (coupon || tokensArray.length === 0) {
        console.log("STO SCRIVENDO SU BLOCKCHAIN");
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

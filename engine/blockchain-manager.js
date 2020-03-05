'use strict';

const HttpStatus = require('http-status-codes');

async function createBlockchainUser() {

}

async function editBlockchainUser() {

}

async function deleteBlockchainUser() {

}

async function createBlockchainCoupon(coupon, tokensArray) {
    try {
        //Parametri: Il Coupon ed il numero di coupon da inserire
        //verifica i parametri inseriti e
        //inserisci il coupon nella blockchain

    } catch (err) {
        throw new Error('createBlockchainCoupon - an error occurred when inserting the coupon in the blockchain');
    }
}

async function editBlockchainCoupon(coupon, campaignid) {
    try {

    } catch (err){
        throw new Error ('editBlockchainCoupon - an error occurred when editing the coupon in the blockchain');
    }
}

async function deleteBlockchainCoupon(coupon, campaignid) {
    try {

    } catch (err){
        throw new Error ('deleteBlockchainCoupon - an error occurred when removing the coupon in the blockchain');
    }
}

async function getBlockchainAvaiableCoupons(user) {

}

async function buyBlockchainCoupon() {

}

async function getBlockchainCouponById() {

}

async function redeemBlockchainCoupon() {

}

module.exports = {
    createBlockchainUser, editBlockchainUser, deleteBlockchainUser, createBlockchainCoupon,
    editBlockchainCoupon, redeemBlockchainCoupon, deleteBlockchainCoupon, buyBlockchainCoupon,
    getBlockchainCouponById, getBlockchainAvaiableCoupons
};

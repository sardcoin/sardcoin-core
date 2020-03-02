'use strict';

const HttpStatus = require('http-status-codes');

async function createBlockchainUser() {

}

async function editBlockchainUser() {

}

async function deleteBlockchainUser() {

}

async function createBlockchainCoupon(coupon, token, quantity) {
    try {
        //Parametri: Il Coupon ed il numero di coupon da inserire
        //verifica i parametri inseriti e
        //inserisci il coupon nella blockchain

    } catch (err){
        throw new Error('createBlockchainCoupon - an error occurred when inserting the coupon in the blockchain');
    }
}

async function editBlockchainCoupon() {

}

async function deleteBlockchainCoupon() {

}

async function getBlockchainAvaiableCoupons() {

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

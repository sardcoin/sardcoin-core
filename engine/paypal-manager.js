'use strict';
const HttpStatus = require('http-status-codes');
const paypalApi = require('paypal-nvp-api');
const crypto = require('crypto');
const _ = require('lodash');

const OrderManager = require('../engine/orders-manager');
const Coupon = require('../models/index').Coupon;
const User = require('../models/index').User;

/** PUBLIC METHODS **/
const setCheckout = (config) => {
  return async (req, res) => {
    const Paypal = paypalApi(config['Paypal']);
    let link = config['Paypal']['mode'] === 'sandbox' ? 'https://www.sandbox.paypal.com/' : 'https://www.paypal.com/';

    const order = req.body;
    let coupon, grouped, query, resultSet;
    const coupons = [];

    try {
      for (const i in order) {
        coupon = await getCouponByID(order[i]['id']);
        coupon.dataValues['quantity'] = order[i]['quantity'];
        coupons.push(coupon);
      }

      grouped = _.groupBy(coupons, 'owner');

      if (Object.keys(grouped).length > 10) {
        return res.status(HttpStatus.BAD_REQUEST).send({
          status: HttpStatus.BAD_REQUEST,
          message: 'You can\'t buy more than 10 products at time'
        });
      }


      query = await setQuery(grouped, config['siteURL']);
      resultSet = await Paypal.request('SetExpressCheckout', query);
      link += 'checkoutnow?token=' + resultSet.TOKEN;

      return res.status(HttpStatus.OK).send({link: link});

    } catch (e) {
      console.error(e);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        message: 'Error doing something'
      })
    }
  }
};
const confirm = (config) => {
  console.log('config', config)
  return async (req, res) => {
    res.redirect(config['siteURL'] + (config['siteURL'].includes('localhost') ? ':4200' : '') +
        (config['siteURL'].includes('localhost') ? '#/checkout?token' : '/prealpha/#/checkout?token=') + req.query.token);
  };
};
const pay = (config) => {
  return async (req, res) => {
    const Paypal = paypalApi(config['Paypal']);
    let resultGet, resultDo, revert;

    try {
      resultGet = await Paypal.request('GetExpressCheckoutDetails', {token: req.body.token});
      resultDo = await Paypal.request('DoExpressCheckoutPayment', resultGet);

      return res.status(HttpStatus.OK).send({
        paid: true,
        result: resultDo
      })
    } catch (e) {
      console.error(e);
      revert = await OrderManager.revertOrder(req.body.order_id);

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        call: 'pay',
        message: 'Error doing the payment'
      });
    }
  }
};

/** EXPORT **/
module.exports = {setCheckout, confirm, pay};

/** PRIVATE METHODS **/
const setQuery = async (groupedCoupons, siteURL) => {
  console.log('groupedCoupons', groupedCoupons)
  let m, n = 0;
  let userOwner;
  let amt;
  let query = {
    'RETURNURL': siteURL + ':8080/paypal/confirm',
    'CANCELURL': siteURL + (siteURL.includes('localhost') ? ':4200' : '') + '/prealpha/#/reserved-area/checkout?err=true'
  };

  /** L_PAYMENTREQUEST_n_NAMEm **/
  // n (numero di pagamento all'interno dello stesso) -> dev'essere compreso tra 0 e 9 (max 10 pagamenti a produttori diversi)
  // m (numero del prodotto) -> non ha limiti
  for (const owner in groupedCoupons) {
    userOwner = await getOwnerById(owner);

    amt = 0; // Ammontare spettante ad ogni produttore
    m = 1;

    for (const coupon in groupedCoupons[owner]) {

        if (groupedCoupons[owner][coupon].dataValues.price > 0) { // Non sono permessi ITEM con PRICE = 0
        query = getQueryItem(query, groupedCoupons[owner][coupon].dataValues, n, m);
        amt += groupedCoupons[owner][coupon].dataValues.quantity * groupedCoupons[owner][coupon].dataValues.price;
        m++;
      }
    }

    if (amt > 0) {
        query['PAYMENTREQUEST_' + n + '_PAYMENTACTION'] = 'Sale';
        query['PAYMENTREQUEST_' + n + '_CURRENCYCODE'] = 'EUR';
        query['PAYMENTREQUEST_' + n + '_AMT'] = amt;

        query['PAYMENTREQUEST_' + n + '_PAYMENTREQUESTID'] = getPaymentRequestId(userOwner, amt);
        query['PAYMENTREQUEST_' + n + '_SELLERPAYPALACCOUNTID'] = userOwner.email_paypal;

        n++;
    }
  }
  return query;
};
const getCouponByID = async (coupon_id) => {
  return await Coupon.findOne({where: {id: coupon_id}});
};
const getOwnerById = async (owner_id) => {
  return await User.findOne({where: {id: owner_id}});
};
const getPaymentRequestId = (userOwner, amt) => {
  const min = Math.ceil(1);
  const max = Math.floor(1000000);
  const total = Math.floor(Math.random() * (max - min)) + min;

  return crypto.createHash('sha256').update(userOwner.email_paypal + amt + +total.toString()).digest('hex');
};
const getQueryItem = (query, coupon, n, m) => {
  query['L_PAYMENTREQUEST_' + n + '_NAME' + m] = coupon.title;
  query['L_PAYMENTREQUEST_' + n + '_DESC' + m] = coupon.description;
  query['L_PAYMENTREQUEST_' + n + '_AMT' + m] = coupon.price;
  query['L_PAYMENTREQUEST_' + n + '_QTY' + m] = coupon.quantity;
  query['L_PAYMENTREQUEST_' + n + '_NUMBER' + m] = m;
  // query['L_PAYMENTREQUEST_' + n + '_ITEMCATEGORY' + m] = 'Physical';

  return query;
};


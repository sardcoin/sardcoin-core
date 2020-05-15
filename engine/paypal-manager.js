'use strict';
const HttpStatus = require('http-status-codes');
//const paypalApi = require('paypal-nvp-api'); //old API payment
const crypto = require('crypto');
const _ = require('lodash');
const AccessManager = require('../engine/access-manager')
const OrderManager = require('../engine/orders-manager');
const Coupon = require('../models/index').Coupon;
const User = require('../models/index').User;
const CouponTokenManager = require('./coupon-token-manager');
const PackageManager = require('./package-manager');
let config    = require(__dirname + '/../config/config.json');

// new payment paypal
const paypal = require('@paypal/checkout-server-sdk');

/** PUBLIC METHODS **/
// old payment
// const setCheckout = (config) => {
//   //console.log('config', config)
//   return async (req, res) => {
//     //console.log('config', config)
//     const Paypal = paypalApi(config['Paypal']);
//     let link = config['Paypal']['mode'] === 'sandbox' ? 'https://www.sandbox.paypal.com/' : 'https://www.paypal.com/';
//
//     const order = req.body;
//     let coupon, grouped, query, resultSet;
//     const coupons = [];
//
//     try {
//       for (const i in order) {
//         coupon = await getCouponByID(order[i]['id']);
//         coupon.dataValues['quantity'] = order[i]['quantity'];
//         coupons.push(coupon);
//       }
//
//       grouped = _.groupBy(coupons, 'owner');
//
//       if (Object.keys(grouped).length > 10) {
//         return res.status(HttpStatus.BAD_REQUEST).send({
//           status: HttpStatus.BAD_REQUEST,
//           message: 'You can\'t buy more than 10 products at time'
//         });
//       }
//
//
//       query = await setQuery(grouped, config['siteURL']);
//       console.log('query', query);
//
//       resultSet = await Paypal.request('SetExpressCheckout', query);
//       //console.log('resultSet', resultSet);
//
//       link += 'checkoutnow?token=' + resultSet.TOKEN;
//       //console.log('link', link);
//       return res.status(HttpStatus.OK).send({link: link});
//
//     } catch (e) {
//       console.error(e);
//       return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
//         message: 'Error doing something'
//       })
//     }
//   }
// };

// TODO IS SECURE? WORING BECAUSE THE CALL IS FREE
// old payment
// const confirm = (config) => {
//   //console.log('confirm calling')
//   return async (req, res) => {
//     res.redirect(config['siteURL'] + (config['siteURL'].includes('localhost') ? ':4200' : '') +
//         (config['siteURL'].includes('localhost') ? '/#/checkout?token=' : '/prealpha/#/checkout?token=') + req.query.token);
//   };
// };
// const pay = (config) => {
//   return async (req, res) => {
//     const Paypal = paypalApi(config['Paypal']);
//     let resultGet, resultDo, revert;
//
//     try {
//       resultGet = await Paypal.request('GetExpressCheckoutDetails', {token: req.body.token});
//       resultDo = await Paypal.request('DoExpressCheckoutPayment', resultGet);
//
//       return res.status(HttpStatus.OK).send({
//         paid: true,
//         result: resultDo
//       })
//     } catch (e) {
//       console.error(e);
//       revert = await OrderManager.revertOrder(req.body.order_id);
//
//       return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
//         call: 'pay',
//         message: 'Error doing the payment'
//       });
//     }
//   }
// };

// TODO NEW METHODS FOR NEW PAYPAL


// const createOrderPaypal = async (data) => {
//   const environment = new paypal.core.SandboxEnvironment('AfN6TGSYjMeGw5o_z7_w4uPltyD9xD8ySOV4Qh8Y2Z277oQqEEV2AIX-4prtZXYWVy78BFsu5Lv6pp9O', 'EA1x5M7RWpmLHGNJeyoc7w3iITNl5EQ17mIhcUev9TyTX9RSyC1-U8b70ED_seNBgQrNnKEeCwpn4foH');
//   const client = new paypal.core.PayPalHttpClient(environment);
//   //console.log('data', data)
//   const request = new paypal.orders.OrdersCreateRequest();
//   request.prefer("return=representation");
//   request.requestBody({
//     intent: 'CAPTURE',
//     purchase_units: [{
//       amount: {
//         currency_code: 'USD',
//         value: '220.00'
//       }
//     }]
//   });
//   //console.log('request', request.body.purchase_units[0])
//
//   let order;
//
//   try {
//     console.log('order')
//     order = await client.execute(request);
//     return  async (req, res) => {
//       console.log('resresres', res)
//
//       res.status(200).json({
//         orderID: order.result.id
//       });
//     }
//   } catch (err) {
//
//     // 4. Handle any errors from the call
//     console.error(err);
//     return async (req, res) => {res.send(500)};
//   }
//
//   // 5. Return a successful response to the client with the order ID
//   return async (req, res) => {
//     console.log('fine', res)
//
//     res.status(200).json({
//       orderID: order.result.id
//     });
//   }
// }

// const getOrderPaypal = async (orderID) => {
//   const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');
//
//   const environment = new paypal.core.SandboxEnvironment('AfN6TGSYjMeGw5o_z7_w4uPltyD9xD8ySOV4Qh8Y2Z277oQqEEV2AIX-4prtZXYWVy78BFsu5Lv6pp9O', 'EA1x5M7RWpmLHGNJeyoc7w3iITNl5EQ17mIhcUev9TyTX9RSyC1-U8b70ED_seNBgQrNnKEeCwpn4foH');
//   const client = new paypal.core.PayPalHttpClient(environment);
//
//   let request = new checkoutNodeJssdk.orders.OrdersGetRequest(orderID);
//
//   let order;
//   try {
//     order = await client.execute(request);
//   } catch (err) {
//
//     // 4. Handle any errors from the call
//     console.error(err);
//     return res.send(500);
//   }
//
//   // 5. Validate the transaction details are as expected
//   if (order.result.purchase_units[0].amount.value !== '220.00') {
//     return res.send(400);
//   }
//
//   // 6. Save the transaction in your database
//   // await database.saveTransaction(orderID);
//
//   // 7. Return a successful response to the client
//   return res.send(200);
// }


let createOrder  = async function(req, res){
  // console.log('reqreqreq coupon_id', req.params.coupon_id)
  // console.log('reqreqreq price', req.params.price)
  // console.log('reqreqreq producer', req.params.producer)
  // console.log('reqreqreq quantity', req.params.quantity)
  // console.log('reqreqreq consumer', req.params.consumer)

  const coupon_id = req.params.coupon_id
  const price = req.params.price
  const producer_id = req.params.producer
  const quantity = req.params.quantity
  const consumer = req.params.consumer
  let client_id
  let password_secret
  let totalPrice
  let isPending
  try {
    isPending = await CouponTokenManager.isCouponsPendening(consumer, coupon_id, quantity)
    // console.log('isPending isCouponsPendening', isPending)

    if (!isPending) {
      isPending = await  PackageManager.isPackagePendening(consumer, coupon_id, quantity)
      // console.log('isPending isPackagePendening', isPending)


    }
    //console.log('is pending', isPending)
    if (!isPending) {
      // console.log('!isPending ', isPending)

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(

          {
            error: true,
            message: 'This coupon is unavailable'
          }

      );
    }
  } catch (e) {
    // console.log('catch isCouponsPendening', e)

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(
        {
          error: true,
          message: 'Internal server error isCouponsPendening'
        }

    );
  }
  try {
    client_id = (await AccessManager.getClientId(producer_id)).getDataValue('client_id')
    // console.log('reqreqreq client_id', client_id)

    password_secret = (await AccessManager.getPasswordSecret(producer_id)).getDataValue('password_secret')
    // console.log('reqreqreq password_secret', password_secret)

    totalPrice = (price * quantity).toFixed(2)
    // console.log('reqreqreq totalPrice', totalPrice)

  } catch (e) {
    // console.log('catch  errorclient_id or password_secret', e)

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(
        {
          error: true,
          message: 'Internal server errorclient_id or password_secret'
        }

    );
  }


  try {

    let client = getClient(client_id,password_secret, producer_id);
    console.log(`client: ${JSON.stringify(client)}`);

    let request = new paypal.orders.OrdersCreateRequest();
    console.log(`request: ${JSON.stringify(request)}`);

    // add request item description
    // https://developer.paypal.com/docs/api/orders/v2/#definition-purchase_unit_request
    // https://developer.paypal.com/docs/api/orders/v2/#definition-item
    request.requestBody({
      "intent": "CAPTURE",
      "currency": "EUR",
      "application_context": {
        "brand_name": "SardCoin",
      },

      "purchase_units": [
        {
          "reference_id": coupon_id.toString() + 'x' + quantity.toString(),
          "amount": {
            "currency_code": "EUR",
            "value": totalPrice
          },

        }
      ]
    })
    //console.log('resresres', res)



    let response = await client.execute(request);
    // console.log(`Response: ${JSON.stringify(response)}`);
    // // If call returns body in response, you can get the deserialized version from the result attribute of the response.
    // console.log(`Order: ${JSON.stringify(response.result)}`);
    // console.log('resresres', res)

    return res.status(HttpStatus.OK).send(
        JSON.stringify(response.result)

    );

  } catch (e) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(
        {
          error: true,
          message: 'error create order paypal'
        }

    );
    console.error('errore create order paypal', e)

  }


}

// send at payment success
let captureOrder =  async function(order_id, producer_id) {
  const orderId = order_id;
  // console.log('orderrrrrrCapt',orderId)
  const request = new paypal.orders.OrdersCaptureRequest(orderId);

  // console.log('requestrequest',request)
  // console.log('requestrequest producer_id',producer_id)

  request.requestBody({});
  // Call API with your client and get a response for your call
  try {
    const client_id = (await AccessManager.getClientId(producer_id)).getDataValue('client_id')
    // console.log('reqreqreq client_id', client_id)
    const password_secret = (await AccessManager.getPasswordSecret(producer_id)).getDataValue('password_secret')
    // console.log('reqreqreq password_secret', password_secret)

    let client = getClient(client_id,password_secret, producer_id);
    // console.log(`client: ${JSON.stringify(client)}`);
    request.requestBody = request.requestBody({});
    let response = await client.execute(request);

    // console.log(`Response: ${JSON.stringify(response)}`);
    // If call returns body in response, you can get the deserialized version from the result attribute of the response.
    // console.log(`Capture: ${JSON.stringify(response.result)}`);
    return response.result

  } catch (e) {
    console.log('error capture', e)
    return false
  }

}





/** EXPORT **/
module.exports = {createOrder, captureOrder};

/** PRIVATE METHODS **/
const setQuery = async (groupedCoupons, siteURL) => {
  //console.log('groupedCoupons', groupedCoupons)
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

const getClient = (client_id, password_secret, user_id) => {
  // console.log('process.env.NODE_ENV', process.env.NODE_ENV)
  // const env = process.env.NODE_ENV || 'development'; //TODO verifier if run production return a value
  // console.log('env', env);
  // console.log('process', process);
  // console.log('process.env', process.env);
  let environment = undefined
  console.log('config', config)
  if(config.test == false) {
    if (user_id == 1 || user_id == 15) { //if user has 1 or 15 (username producer or broker, paypal running of sandbox
      // this users have client id and password secret generated for sandbox
      environment = new paypal.core.SandboxEnvironment(client_id, password_secret); // clientId and password secret (into db) Sandbox mode for userId=1 and 15 (producer and broker)

    } else {
      environment = new paypal.core.LiveEnvironment(client_id, password_secret); // clientId and password secret (into db) live mode


    }
  } else if (config.test == true) {
    environment = new paypal.core.SandboxEnvironment(client_id, password_secret); // clientId and password secret (into db) Sandbox mode

  }
  // console.log(`environmentLive: ${JSON.stringify(environment)}`);

  let client = new paypal.core.PayPalHttpClient(environment);
  // console.log(`client: ${JSON.stringify(client)}`);


  return client
}

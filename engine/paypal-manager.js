'use strict';
const HttpStatus = require('http-status-codes');
const _ = require('lodash');
const AccessManager = require('../engine/access-manager')
const CouponTokenManager = require('./coupon-token-manager');
const PackageManager = require('./package-manager');
let config    = require(__dirname + '/../config/config.json');

// new payment paypal
const paypal = require('@paypal/checkout-server-sdk');

let createOrder  = async function(req, res){
  const coupon_id = req.params.coupon_id
  const price = req.params.price
  const producer_id = req.params.producer
  const quantity = req.params.quantity
  const consumer = req.params.consumer
  const companyName = req.params.companyName
  let client_id
  let password_secret
  let totalPrice
  let isPending
  try {
    isPending = await CouponTokenManager.isCouponsPendening(consumer, coupon_id, quantity)

    if (!isPending) {
      isPending = await  PackageManager.isPackagePendening(consumer, coupon_id, quantity)


    }
    if (!isPending) {

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(

          {
            error: true,
            message: 'This coupon is unavailable, try again.'
          }

      );
    }
  } catch (e) {
    // console.log('catch isCouponsPendening', e)

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(
        {
          error: true,
          message: 'Internal server error isCouponsPending'
        }

    );
  }
  try {
    client_id = (await AccessManager.getClientId(producer_id)).getDataValue('client_id')

    password_secret = (await AccessManager.getPasswordSecret(producer_id)).getDataValue('password_secret')

    totalPrice = (price * quantity).toFixed(2)

  } catch (e) {

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(
        {
          error: true,
          message: 'Internal server error client_id or password_secret'
        }

    );
  }


  try {

    let client = getClient(client_id,password_secret, producer_id);
    console.log(`client: ${JSON.stringify(client)}`);
    let request = new paypal.orders.OrdersCreateRequest();
    console.log(`request: ${JSON.stringify(request)}`);


    request.requestBody({
      "intent": "CAPTURE",
      "currency": "EUR",


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



    let response = await client.execute(request);


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

  const client = new paypal.core.PayPalHttpClient(environment);


  return client
}

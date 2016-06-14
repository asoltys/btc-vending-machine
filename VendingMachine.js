'use strict'
const Kefir = require('kefir');
const Promise = require('bluebird');
const exchangeRateStream = require('./quadrigacx');
const webSocketPromise = require('./blockio');
const utxoPollPromise = require('./blockchaininfo');
const products = require('./products');
const addressMap = {};
const exec = require('child_process').exec;
products.forEach(product=>{
  addressMap[product.address] = {
    price: product.price,
    pin: product.gpioPin
  }
})
Promise.all([webSocketPromise])
  .then(paymentStreamArray=>{
    const allPaymentStreams = Kefir.merge(paymentStreamArray).log('merged payment layer triggered')
    const normalizedPaymentStream = Kefir.combine([allPaymentStreams,exchangeRateStream], (payment, exchangeRate)=>{
        var paymentCents = payment.recieved * exchangeRate * 100;
        var normalizedPayment = paymentCents / addressMap[payment.address].price;
        console.log({paymentCents, normalizedPayment});
        return normalizedPayment;
    });

    const heartbeat = Kefir.interval(1000, {isHeartbeat:true});
    const timingLayer = Kefir.merge([normalizedPaymentStream,heartbeat])
      .scan((status, timingEvent)=>{
        if (timingEvent.isHeartbeat){
          if (status.wait > 0){
            status.trigger = false
            status.wait -=1;
            return status
          }
          if (status.pending > 1){
              status.trigger = true;
              status.pending -= 1
              status.wait = 12
            }
          return status
        }
        else{
          status.pending += timingEvent
          return status
        }
      }, {trigger:false, wait:0, pending:19}).log('Current Status: ')

    const outputStream = timingLayer
      .filter( status => status.trigger)
      .flatMapConcat(() => Kefir.sequentially(2000, [1, 0]))
      .log('Pin Value: ')
      .onValue(pinValue => {
	console.log({pinValue});
	exec(`echo "` + pinValue + `"> /sys/class/gpio/gpio17/value`)
      });
  });

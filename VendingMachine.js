'use strict'
const Kefir = require('kefir');
const Promise = require('bluebird');
const exchangeRateStream = require('./quadrigacx');
const webSocketPromise = require('./blockio');
const utxoPollPromise = require('./blockchaininfo');
const products = require('./products');
const addressMap = {};
const exec = require('child_process').exec;
const txs = [];

products.forEach(product=>{
  addressMap[product.address] = {
    price: product.price,
    pin: product.gpioPin
  }
})

// Create a random transaction for testing:
function randomTx() {
    return {
        txid: Math.round(Math.random()*3).toString(),
        recieved: 0.0003,
        address: products[0].address }
}
//const dummy = Kefir.fromPoll(1000, randomTx)


function checkSeen(payment){
  if (txs.indexOf(payment.txid) != -1) {
      console.log('Already saw txn', {payment});
      return false
  }
  txs.push(payment.txid)
  return true
}


Promise.all([webSocketPromise, utxoPollPromise])
  .then(paymentStreamArray=>{
    const allPaymentStreams = Kefir
        .merge(paymentStreamArray)
        .filter(checkSeen);

    var currentExchangeRate;
    const normalizedPaymentStream = Kefir.combine([allPaymentStreams,exchangeRateStream], (payment, exchangeRate)=>{
      if (currentExchangeRate !== exchangeRate) {
        currentExchangeRate = exchangeRate;
        return 0;
      }
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
      }, {trigger:false, wait:0, pending:0}).log('Current Status: ')

    const outputStream = timingLayer
      .filter( status => status.trigger)
      .flatMapConcat(() => Kefir.sequentially(2000, [1, 0]))
      .log('Pin Value: ')
      .onValue(pinValue => {
	console.log({pinValue});
	exec(`echo "` + pinValue + `"> /sys/class/gpio/gpio17/value`)
      });
  });

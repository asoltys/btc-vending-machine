'use strict'
const Kefir = require('kefir');
const Promise = require('bluebird');
const EventEmitter = require('events');
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

// // Dummy for testing
// function randomTx() {
//     return {
//         txid: Math.round(Math.random()*2).toString(),
//         recieved: 0.003,
//         address: products[0].address }
// }
// const dummy = Kefir.fromPoll(10000, randomTx)

// filters
function filterSeen(payment){
  if (txs.indexOf(payment.txid) != -1) {
      console.log('Already saw txn', {payment});
      return false
  }
  txs.push(payment.txid)
  return true
}

var currentRate = false;
function filterRateChange(payment){
    let pass
    if (!currentRate || currentRate != payment.rate) {
      currentRate = payment.rate;
      pass = false;
    }else {
      pass = true
    }
    console.log({pass, currentRate})
    return pass
}

// maps
function normalizePayment(payment){
  let paid = payment.recieved * payment.rate * 100; //cents
  let price = addressMap[payment.address].price
  console.log({paid, price})
  return paid / price;
}

Promise.all([webSocketPromise, utxoPollPromise/*, dummy*/])
  .then(paymentStreamArray=>{
    const allPaymentStreams = Kefir
        .merge(paymentStreamArray)
        .filter(filterSeen);

    const purchases = Kefir
      .combine([allPaymentStreams,exchangeRateStream], (payment, rate)=>{
        payment['rate'] = rate;
        return payment;
      })
      .log('Attempting to prevent.')
      .filter(filterRateChange)
      .log('Allowed To Trigger')
      .map(normalizePayment)
      .log('purchases')

    var heartbeat;
    const _beat = {}
    const heartStream = Kefir.stream(beat => {
      heartbeat = setInterval(beat.emit, 1000, {isHeartbeat: true});
      _beat['emit'] = beat.emit
    });
    const timingLayer = Kefir
      .merge([purchases,heartStream])
      .scan((status, timingEvent)=>{
        if (timingEvent.isHeartbeat){
          if (status.wait > 0){
            status.trigger = false
            status.wait -= 1;
          } else if (status.pending > 1){
              status.trigger = true;
              status.pending -= 1
              status.wait = 12
          } else {
            console.log('clearing heartbeat')
            clearInterval(heartbeat)
            heartbeat = false;
          }
          return status
        } else {
          status.pending += timingEvent
          if (!heartbeat){
            heartbeat = setInterval(_beat.emit, 1000, {isHeartbeat: true});
          }
          return status
        }
      }, {trigger:false, wait:0, pending:0})
      .log()

    const outputStream = timingLayer
      .filter( status => status.trigger)
      .flatMapConcat(() => Kefir.sequentially(2000, [1, 0]))
      .onValue(pinValue => exec(`echo "` + pinValue + `"> /sys/class/gpio/gpio17/value`));
  });

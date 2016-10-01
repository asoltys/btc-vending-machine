const log = require('debug')('VM')

const Kefir = require('kefir');
const Promise = require('bluebird');
const EventEmitter = require('events');

const paymentLayer = require('./paymentLayer')
const priceLayer = require('./priceLayer')
const vendingMachine = require('./payoutLayer/vendingMachine')

Promise.resolve(paymentLayer)
  .then(paymentStream=>{
    vendingMachine(paymentStream, priceLayer)
  });

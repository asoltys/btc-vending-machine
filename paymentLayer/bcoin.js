const log = require('debug')('VM:PaymentLayer:bcoin')

const Kefir = require('kefir')
const Promise = require('bluebird')
const bcoin = require('bcoin');

const config = require('../config')
const addresses = config.map(product => product.address);

var chain = new bcoin.chain({
  db: 'leveldb',
  // A custom chaindb location:
  location: process.env.HOME + '/chain.db',
  spv: true
});

var pool = new bcoin.pool({
  chain: chain,
  spv: true,
  size: 1,
  maxPeers: 1
});

pool.open(err => {
    addresses.forEach((a) => pool.watchAddress(a));

    pool.connect();
    pool.startSync();



    pool.on('error', err => { /* keep calm and bitcoin on */ });
    done(null, pool); //addressWatcher
})

let bcoinTxStream = Kefir
    .fromEvents(pool, 'tx')
    .map(tx => {
      //TODO: parse event to:
      // txid: tx.txid,
      // received: tx.amount,
      // address: tx.address
    })

module.exports = Promise.resolve(bcoinTxStream)

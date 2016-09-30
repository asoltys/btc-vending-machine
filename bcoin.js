const Kefir = require('kefir')
const Promise = require('bluebird')
const WebSocket = require('ws');
const bcoin = require('bcoin');
const products = require('./products')
const addresses = products.map(product => product.address);

function configure(products) {
  /*
  var ws = new WebSocket('wss://n.block.io/');
  return Promise.fromCallback(done => {
    ws.on('open', () => {
      products.forEach( product=>{
        console.log('subscribe to ',product.address )
        ws.send(JSON.stringify({
          "network": "BTC",
          "type": "address",
          "address": product.address
        }));
      });
      done(null, ws); //addressWatcher
    });
  });
  */
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

  return Promise.fromCallback(done => {
    pool.open(err => {
      addresses.forEach((a) => pool.watchAddress(a));

      pool.connect();
      pool.startSync();

      pool.on('error', err => { /* keep calm and bitcoin on */ });
      done(null, pool); //addressWatcher
    });
  });
}

function parse(tx){
  return {
    txid: tx.txid,
    received: tx.amount,
    address: tx.address
  }
}

module.exports = configure(products)
  .then(watcher => {
    console.log('Starting up bcoin')
    return Kefir.fromEvents(watcher, 'tx')
      .log('bcoin tx seen')
//      .filter(value => value.type == 'address')
//      .filter(value => value.data.confirmations < 2)
//      .map(parseAddressEvent)
    })




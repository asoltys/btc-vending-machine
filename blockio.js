const Kefir = require('kefir')
const Promise = require('bluebird')
const WebSocket = require('ws');
const exchangeRateStream = require('./quadrigacx')
const webSocketPromise = require('./blockio')
const utxoPollPromise = require('./blockchaininfo')
const products = require('./products')

function configureWebSocket(products){
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
}

function parseAddressEvent(addressEvent){
  return {
    txid: addressEvent.data.txid,
    recieved: addressEvent.data.amount_received,
    address: addressEvent.data.address
  }
}

module.exports = configureWebSocket(products)
  .then(addressWatcher => {
    console.log('Starting up the web socket watcher')
    return Kefir.fromEvents(addressWatcher, 'message')
      .log('Raw Blockr Event')
      .map(JSON.parse)
      .filter(value => value.type == 'address')
      .filter(value => value.data.confirmations < 2)
      .map(parseAddressEvent)
      .log('Blockr Address Event Created')
    })

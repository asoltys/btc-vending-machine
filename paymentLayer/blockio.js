const log = require('debug')('VM:PaymentLayer:blockio')
const config = require('../config')

const Kefir = require('kefir')
const Promise = require('bluebird')
const WebSocket = require('ws');

function configureWebSocket(config) {
    return Promise.fromCallback(done => {
        let ws = new WebSocket('wss://n.block.io/');
        ws.on('open', () => {
            config.forEach(product => {
                log('subscribe to ', product.address)
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

function parseAddressEvent(addressEvent) {
    return {
        txid: addressEvent.data.txid,
        recieved: addressEvent.data.amount_received,
        address: addressEvent.data.address
    }
}

module.exports = configureWebSocket(config)
    .then(addressWatcher => {
        log('Starting up the web socket watcher')
        return Kefir.fromEvents(addressWatcher, 'message')
            .log('Raw Blockr Event')
            .map(JSON.parse)
            .filter(value => value.type == 'address')
            .filter(value => value.data.confirmations < 2)
            .map(parseAddressEvent)
            .log('Blockr Address Event Created')
    })

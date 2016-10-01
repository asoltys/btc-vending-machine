const log = require('debug')('VM:PaymentLayer')

const Kefir = require('kefir')
const Promise = require('bluebird')

// Promises of Streams
const blockio = require('./blockio')
const blockchaininfo = require('./blockchaininfo')
    //TODO const bcoin = require('./bcoin')

const txs = [];

function randomTx() {
    return {
        txid: Math.round(Math.random()*3).toString(),
        recieved: 0.003,
        address: products[0].address }
}
const dummy = Kefir.fromPoll(10000, randomTx)


module.exports =
    Promise.all([blockchaininfo, blockio /*TODO,bcoin*/, dummy ])
    // TODO: correctly continue if less than all promises error
    .then(allPayments => {
        log("Initializing Payment Processing")
        return Kefir
            .merge(allPayments)
            .filter(filterSeen)
    })

function filterSeen(payment) {
    if (txs.indexOf(payment.txid) != -1) {
        log('Already saw txn', payment);
        return false
    }
    txs.push(payment.txid)
    log('New Payment Seen', payment)
    return true
}

const url = 'https://blockchain.info/unconfirmed-transactions?format=json';
const Kefir = require('kefir');
const Promise = require('bluebird');
const request = require('superagent');
const INTERVAL = 23456;
const products = require('./products');
const addresses = products.map(product => product.address);

function getUtxo(emit){
  request.get(url).end((err, res)=>{
    if(!err){
      var txs = res.body
      if (txs.txs != null) {
        txs.txs.forEach( transaction=>{
          if (transaction.out != null) {
            transaction.out.forEach(output =>{
              if (addresses.indexOf(output.addr) > -1){
                emit({
                  txid: transaction.txid,
                  recieved: output.value / 10000000,
                  address: output.addr
                })
              }
            })
          }
        })
      }
    };
  });
}


const utxoStream = Kefir.stream( emitter => {
  getUtxo(emitter.emit);
  setInterval(getUtxo, INTERVAL , emitter.emit);
}).log('Payment Found In Utxo: ');

module.exports = Promise.resolve(utxoStream);
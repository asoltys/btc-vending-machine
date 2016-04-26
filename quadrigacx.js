const url = 'https://api.quadrigacx.com/v2/ticker';
const Kefir = require('kefir');
const request = require('superagent');
const Promise = require('bluebird');
const INTERVAL = 777777;

const exchangeRateStream = Kefir.stream( emitter => {
  function getExchangeRate(emit){
    request.get(url).end((err, res)=>{
      if(!err) emit(res.body.vwap);
    });
  }
  getExchangeRate(emitter.emit);
  setInterval(getExchangeRate, INTERVAL , emitter.emit);
});

module.exports = exchangeRateStream.log('Exchange Rate:');

const url = 'https://api.quadrigacx.com/v2/ticker';
const Kefir = require('kefir');
const request = require('superagent');
const Promise = require('bluebird');
const INTERVAL = 777777;

function getExchangeRate(emit) {
    request.get(url).end((err, res)=>{
        if(!err) emit(res.body.vwap);
    });
}

function emittron (emitter) {
  getExchangeRate(emitter.emit);
  setInterval(getExchangeRate, INTERVAL , emitter.emit);
}

const exchangeRateStream = Kefir.stream(emittron);

// const dummy =  Kefir.fromPoll(10000, () => Math.random()*1000);
// const exchangeRateStream = dummy


var currentRate;
module.exports = exchangeRateStream
  .log('New Exchange Rate:')
  .filter( rate => {
    if(currentRate !== rate){
        currentRate = rate
        return true; // ensure only rate changing events get through
    }
    return false;
  })
  .log('New exchange rate passed through');

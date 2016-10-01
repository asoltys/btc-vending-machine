const log = require('debug')('VM:PriceLayer:quadrigacx')
const url = 'https://api.quadrigacx.com/v2/ticker';

const Kefir = require('kefir');
const Promise = require('bluebird');
const request = require('superagent');

const INTERVAL = 777777;

module.exports = Kefir.stream(emitter => {
    log('Initializing Quadriga polling')
    getExchangeRate(emitter.emit);
    setInterval(getExchangeRate, INTERVAL, emitter.emit);
})

function getExchangeRate(emit) {
    log('polling quadrigacx')
    request.get(url).end((err, res) => {
        if (!err) emit(res.body.vwap);
    });
}

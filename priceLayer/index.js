const log = require('debug')('VM:PriceLayer')

const Kefir = require('kefir')
const Promise = require('bluebird')

// Promises of Streams
const quadrigacx = require('./quadrigacx')
//TODO : more sources of exchange rate, averaging

var currentRate;
let PriceStream = Kefir
  .combine([quadrigacx /*, TODO^ */])
  .map(rates => {
      let sum = rates.reduce( (rate, sum)=> rate + sum, 0 )
      let averageRate = sum/rates.length
      log('Calculated Rate')
      return averageRate
  })
  .onValue(log) //

log('exporting price stream')
module.exports = PriceStream
  .skipDuplicates()

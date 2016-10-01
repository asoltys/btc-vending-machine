const log = require('debug')('VM:PayoutLayer:vendingMachine')

const Kefir = require('kefir')
const Promise = require('bluebird')
const EventEmitter = require('events')

const config = require('../config');
const addressMap = {};
config.forEach(product => {
    addressMap[product.address] = {
        price: product.price,
        pin: product.gpioPin
    }
})

const exec = require('child_process').exec

module.exports = function vendingMachine(paymentStream, rateStream) {

    const purchases = Kefir
        .combine([paymentStream, rateStream], (payment, rate) => {
            console.log("Merging the stream.")
            payment['rate'] = rate;
            return payment;
        })
        .log('Allowed To Trigger')
        .map(normalizePayment)
        .log('purchases')

    var heartbeat;

    const _beat = {}
    const heartStream = Kefir.stream(beat => {
        heartbeat = setInterval(beat.emit, 1000, {
            isHeartbeat: true
        });
        _beat['emit'] = beat.emit
    });

    const timingLayer = Kefir
        .merge([purchases, heartStream])
        .scan((status, timingEvent) => {
            if (timingEvent.isHeartbeat) {
                if (status.wait > 0) {
                    status.trigger = false
                    status.wait -= 1;
                } else if (status.pending > 1) {
                    status.trigger = true;
                    status.pending -= 1
                    status.wait = 12
                } else {
                    console.log('clearing heartbeat')
                    clearInterval(heartbeat)
                    heartbeat = false;
                }
                return status
            } else {
                status.pending += timingEvent
                if (!heartbeat) {
                    heartbeat = setInterval(_beat.emit, 1000, {
                        isHeartbeat: true
                    });
                }
                return status
            }
        }, {
            trigger: false,
            wait: 0,
            pending: 0
        })
        .log()

    const outputStream = timingLayer
        .filter(status => status.trigger)
        .onValue(log)
        .flatMapConcat(() => Kefir.sequentially(2000, [1, 0]))
        .onValue(pinValue => exec(`echo "` + pinValue + `"> /sys/class/gpio/gpio17/value`));

}

// maps
function normalizePayment(payment) {
    let paid = payment.recieved * payment.rate * 100; //cents
    let price = addressMap[payment.address].price
    console.log({
        paid,
        price
    })
    return paid / price;
}

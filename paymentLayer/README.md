The payment layer manages a redundant series of services that are watching the bitcoin network.

The value exported is the (bluebird) Promise of a (kefir) stream.

The payment stream events are of this format:

{
  "network": "BTC",
  "type": "address",
  "address": product.address,
  //TODO:
  "payoutMethod": vending machine payout VS keg 
}

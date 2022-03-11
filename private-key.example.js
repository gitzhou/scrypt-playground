const { bsv } = require('scryptlib');

// fill in your testnet private key WIF here
const wif = ''

const privateKey = new bsv.PrivateKey.fromWIF(wif)
const publicKey = privateKey.publicKey
const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const address = privateKey.toAddress()

module.exports = { privateKey, publicKey, publicKeyHash, address }

const { expect } = require('chai');
const { buildContractClass, buildTypeClasses, bsv, Bytes, getPreimage, SigHashPreimage, toHex, PubKeyHash } = require('scryptlib');
const { compileContract, inputIndex, inputSatoshis, newTx } = require('../../helper');
const axios = require('axios');

const witnessServer = 'https://witnessonchain.com/v1'

const PriceBet = buildContractClass(compileContract('price-bet.scrypt'))
const { RabinSig, RabinPubKey } = buildTypeClasses(PriceBet);

describe('Test PriceBet sCrypt contract with WitnessOnChain.com Service', () => {

    // the rabin public key of WitnessOnChain service
    let rabinPubKey

    before(async () => {
        const infoResponse = await axios.get(`${witnessServer}/info`)
        rabinPubKey = '0x' + Buffer.from(infoResponse.data.public_key.rabin, 'hex').reverse().toString('hex')
    })

    it('should return true', async () => {

        // prepare initail data
        const alicePubKey = new bsv.PrivateKey.fromRandom('testnet').publicKey
        const alicePkh = bsv.crypto.Hash.sha256ripemd160(alicePubKey.toBuffer())

        const bobPubKey = new bsv.PrivateKey.fromRandom('testnet').publicKey
        const bobPkh = bsv.crypto.Hash.sha256ripemd160(bobPubKey.toBuffer())

        const targetPrice = 1000000
        const decimal = 4
        const timestamp = 1626112656
        const symbol = 'BSV_USDT'
        let symbolWithPaddingBuffer = Buffer.alloc(16, 0)
        symbolWithPaddingBuffer.write(symbol)

        // new contract
        const priceBet = new PriceBet(
            targetPrice,
            decimal,
            new Bytes(toHex(symbolWithPaddingBuffer)),
            timestamp,
            new RabinPubKey(rabinPubKey),
            new PubKeyHash(toHex(alicePkh)),
            new PubKeyHash(toHex(bobPkh))
        )

        // retrieve data from WitnessOnChain service
        const ratesResponse = await axios.get(`${witnessServer}/rates/${symbol}`)
        const ratesData = ratesResponse.data

        // here we know who is the winner based on the current price
        const currentPrice = Math.round(ratesData.rate * 10 ** decimal)
        let winnerPubKey = alicePubKey
        if (currentPrice < targetPrice) {
            winnerPubKey = bobPubKey
        }

        // prepare unlock
        const tx = newTx()
        const outputAmount = 90000
        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(winnerPubKey),
            satoshis: outputAmount
        }))
        const preimage = getPreimage(tx, priceBet.lockingScript, inputSatoshis)

        // verify
        const context = { tx, inputIndex, inputSatoshis }
        const s = '0x' + Buffer.from(ratesData.signatures.rabin.signature, 'hex').reverse().toString('hex')
        const sig = new RabinSig({ s: s, padding: new Bytes(ratesData.signatures.rabin.padding) })
        result = priceBet.unlock(
            new SigHashPreimage(toHex(preimage)),
            new Bytes(ratesData.digest),
            sig,
            outputAmount
        ).verify(context)

        expect(result.success, result.error).to.be.true
    })
})

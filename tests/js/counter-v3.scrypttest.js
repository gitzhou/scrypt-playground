const { expect } = require('chai');
const { buildContractClass, bsv, getPreimage, SigHashPreimage, toHex, PubKeyHash } = require('scryptlib');
const { compileContract, inputIndex, inputSatoshis, newTx } = require('../../helper');

const tx = newTx()
const outputAmount = 90000
const Counter = buildContractClass(compileContract('counter-v3.scrypt'))
const initialCounter = 0

describe('Test Counter V3', () => {

    let counter, preimage

    before(() => {
        // new contract
        counter = new Counter(initialCounter)
        // prepare increase unlock transaction
        const newLockingScript = counter.getNewStateScript({ counter: initialCounter + 1 })
        tx.addOutput(new bsv.Transaction.Output({ script: newLockingScript, satoshis: outputAmount }))
        preimage = getPreimage(tx, counter.lockingScript, inputSatoshis)
        counter.txContext = { tx, inputIndex, inputSatoshis }
    })

    it('should succeed when passing correct preimage and output amount', () => {
        const result = counter.increase(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
        expect(result.success, result.error).to.be.true
    })

    it('should fail when passing incorrect preimage', () => {
        const result = counter.increase(new SigHashPreimage(toHex(preimage) + '01'), outputAmount).verify()
        expect(result.success, result.error).to.be.false
    })

    it('should fail when passing incorrect output amount', () => {
        const result = counter.increase(new SigHashPreimage(toHex(preimage)), outputAmount - 1).verify()
        expect(result.success, result.error).to.be.false
    })

    it('should fail when not adding 1 to the counter', () => {
        const newLockingScript = counter.getNewStateScript({ counter: initialCounter })
        const t = newTx()
        t.addOutput(new bsv.Transaction.Output({ script: newLockingScript, satoshis: outputAmount }))
        const _preimage = getPreimage(t, counter.lockingScript, inputSatoshis)

        const context = { tx: t, inputIndex, inputSatoshis }
        const result = counter.increase(new SigHashPreimage(toHex(_preimage)), outputAmount).verify(context)
        expect(result.success, result.error).to.be.false
    })

    it('should succeed when adding one p2pkh output', () => {
        const fundAmount = 10000
        const changeAmount = 10000
        const _outputAmount = inputSatoshis + fundAmount

        const changePrivateKey = new bsv.PrivateKey.fromRandom('testnet')
        const changePkh = bsv.crypto.Hash.sha256ripemd160(changePrivateKey.publicKey.toBuffer())

        const newLockingScript = counter.getNewStateScript({ counter: initialCounter + 1 })
        const t = newTx()
        t.addOutput(new bsv.Transaction.Output({ script: newLockingScript, satoshis: _outputAmount }))
        t.addOutput(new bsv.Transaction.Output({ script: bsv.Script.buildPublicKeyHashOut(changePrivateKey.toAddress()), satoshis: changeAmount }))
        const _preimage = getPreimage(t, counter.lockingScript, inputSatoshis)

        const context = { tx: t, inputIndex, inputSatoshis }
        const result = counter.fund(new SigHashPreimage(toHex(_preimage)), fundAmount, new PubKeyHash(toHex(changePkh)), changeAmount).verify(context)
        expect(result.success, result.error).to.be.true
    })

    it('should fail when adding two p2pkh outputs', () => {
        const fundAmount = 10000
        const changeAmount = 10000
        const _outputAmount = inputSatoshis + fundAmount

        const changePrivateKey = new bsv.PrivateKey.fromRandom('testnet')
        const changePkh = bsv.crypto.Hash.sha256ripemd160(changePrivateKey.publicKey.toBuffer())

        const newLockingScript = counter.getNewStateScript({ counter: initialCounter + 1 })
        const t = newTx()
        t.addOutput(new bsv.Transaction.Output({ script: newLockingScript, satoshis: _outputAmount }))
        t.addOutput(new bsv.Transaction.Output({ script: bsv.Script.buildPublicKeyHashOut(changePrivateKey.toAddress()), satoshis: changeAmount }))
        t.addOutput(new bsv.Transaction.Output({ script: bsv.Script.buildPublicKeyHashOut(changePrivateKey.toAddress()), satoshis: changeAmount }))
        const _preimage = getPreimage(t, counter.lockingScript, inputSatoshis)

        const context = { tx: t, inputIndex, inputSatoshis }
        const result = counter.fund(new SigHashPreimage(toHex(_preimage)), fundAmount, new PubKeyHash(toHex(changePkh)), changeAmount).verify(context)
        expect(result.success, result.error).to.be.false
    })
})

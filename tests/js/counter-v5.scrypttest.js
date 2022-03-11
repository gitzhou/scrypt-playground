const { expect } = require('chai');
const { buildContractClass, bsv, getPreimage, SigHashPreimage, toHex, PubKeyHash, signTx, Sig, PubKey } = require('scryptlib');
const { compileContract, inputIndex, inputSatoshis, newTx } = require('../../helper');

const tx = newTx()
const outputAmount = inputSatoshis
const Counter = buildContractClass(compileContract('counter-v5.scrypt'))
const initialCounter = 0
const Signature = bsv.crypto.Signature
const sigHashType = Signature.SIGHASH_SINGLE | Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_FORKID

const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())

describe('Test Counter V5', () => {

    let counter, preimage

    before(() => {
        // new contract
        counter = new Counter(initialCounter, new PubKeyHash(toHex(publicKeyHash)))
        // prepare increase unlock transaction
        const newLockingScript = counter.getNewStateScript({ counter: initialCounter + 1 })
        tx.addOutput(new bsv.Transaction.Output({ script: newLockingScript, satoshis: outputAmount }))
        preimage = getPreimage(tx, counter.lockingScript, inputSatoshis, inputIndex, sigHashType)
        counter.txContext = { tx, inputIndex, inputSatoshis }
    })

    it('should succeed when passing correct preimage', () => {
        const result = counter.increase(new SigHashPreimage(toHex(preimage))).verify()
        expect(result.success, result.error).to.be.true
    })

    it('should fail when passing incorrect preimage', () => {
        const result = counter.increase(new SigHashPreimage(toHex(preimage) + '01')).verify()
        expect(result.success, result.error).to.be.false
    })

    it('should fail when not adding 1 to the counter', () => {
        const newLockingScript = counter.getNewStateScript({ counter: initialCounter })
        const t = newTx()
        t.addOutput(new bsv.Transaction.Output({ script: newLockingScript, satoshis: outputAmount }))
        const _preimage = getPreimage(t, counter.lockingScript, inputSatoshis, inputIndex, sigHashType)

        const context = { tx: t, inputIndex, inputSatoshis }
        const result = counter.increase(new SigHashPreimage(toHex(_preimage))).verify(context)
        expect(result.success, result.error).to.be.false
    })

    it('should succeed when adding one change output', () => {
        const newLockingScript = counter.getNewStateScript({ counter: initialCounter + 1 })
        const t = newTx()
        t.addOutput(new bsv.Transaction.Output({ script: newLockingScript, satoshis: outputAmount }))
        t.addOutput(new bsv.Transaction.Output({ script: bsv.Script.buildPublicKeyHashOut(new bsv.PrivateKey.fromRandom('testnet').toAddress()), satoshis: 10000 }))
        const _preimage = getPreimage(t, counter.lockingScript, inputSatoshis, inputIndex, sigHashType)

        const context = { tx: t, inputIndex, inputSatoshis }
        const result = counter.increase(new SigHashPreimage(toHex(_preimage))).verify(context)
        expect(result.success, result.error).to.be.true
    })

    it('should succeed when adding two change outputs', () => {
        const newLockingScript = counter.getNewStateScript({ counter: initialCounter + 1 })
        const t = newTx()
        t.addOutput(new bsv.Transaction.Output({ script: newLockingScript, satoshis: outputAmount }))
        t.addOutput(new bsv.Transaction.Output({ script: bsv.Script.buildPublicKeyHashOut(new bsv.PrivateKey.fromRandom('testnet').toAddress()), satoshis: 10000 }))
        t.addOutput(new bsv.Transaction.Output({ script: bsv.Script.buildPublicKeyHashOut(new bsv.PrivateKey.fromRandom('testnet').toAddress()), satoshis: 10000 }))
        const _preimage = getPreimage(t, counter.lockingScript, inputSatoshis, inputIndex, sigHashType)

        const context = { tx: t, inputIndex, inputSatoshis }
        const result = counter.increase(new SigHashPreimage(toHex(_preimage))).verify(context)
        expect(result.success, result.error).to.be.true
    })

    it('should succeed to destroy when passing correct signature and public key', () => {
        const t = newTx()
        const signature = signTx(t, privateKey, counter.lockingScript, inputSatoshis)
        const context = { tx: t, inputIndex, inputSatoshis }
        const result = counter.destroy(new Sig(toHex(signature)), new PubKey(toHex(publicKey))).verify(context)
        expect(result.success, result.error).to.be.true
    })

    it('should fail to destroy when passing incorrect signature', () => {
        const t = newTx()
        const incorrectPrivateKey = new bsv.PrivateKey.fromRandom('testnet')
        const incorrectSignature = signTx(t, incorrectPrivateKey, counter.lockingScript, inputSatoshis)
        const context = { tx: t, inputIndex, inputSatoshis }
        const result = counter.destroy(new Sig(toHex(incorrectSignature)), new PubKey(toHex(publicKey))).verify(context)
        expect(result.success, result.error).to.be.false
    })

    it('should fail to destroy when passing incorrect public key', () => {
        const t = newTx()
        const incorrectPublicKey = new bsv.PrivateKey.fromRandom('testnet').publicKey
        const signature = signTx(t, privateKey, counter.lockingScript, inputSatoshis)
        const context = { tx: t, inputIndex, inputSatoshis }
        const result = counter.destroy(new Sig(toHex(signature)), new PubKey(toHex(incorrectPublicKey))).verify(context)
        expect(result.success, result.error).to.be.false
    })
})

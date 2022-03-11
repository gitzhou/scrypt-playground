const { expect } = require('chai');
const { compileContract, inputIndex, inputSatoshis, newTx } = require('../../helper');
const { buildContractClass, bsv, signTx, toHex, PubKey, PubKeyHash, Sig } = require('scryptlib');

const P2PKH = buildContractClass(compileContract('p2pkh.scrypt'))
const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const tx = newTx()

describe('Test P2PKH', () => {

    let p2pkh

    before(() => {
        p2pkh = new P2PKH(new PubKeyHash(toHex(publicKeyHash)))
        p2pkh.txContext = { tx, inputIndex, inputSatoshis }
    })

    it('should succeed', () => {
        const signature = signTx(tx, privateKey, p2pkh.lockingScript, inputSatoshis)
        const result = p2pkh.unlock(new Sig(toHex(signature)), new PubKey(toHex(publicKey))).verify()
        expect(result.success, result.error).to.be.true
    })

    it('should fail when sign with the incorrect private key', () => {
        const incorrectPrivateKey = new bsv.PrivateKey.fromRandom('testnet')
        const incorrectSignature = signTx(tx, incorrectPrivateKey, p2pkh.lockingScript, inputSatoshis)
        const result = p2pkh.unlock(new Sig(toHex(incorrectSignature)), new PubKey(toHex(publicKey))).verify()
        expect(result.success, result.error).to.be.false
    })

    it('should fail when provide an incorrect public key', () => {
        const incorrectPublicKey = new bsv.PrivateKey.fromRandom('testnet').publicKey
        const signature = signTx(tx, privateKey, p2pkh.lockingScript, inputSatoshis)
        const result = p2pkh.unlock(new Sig(toHex(signature)), new PubKey(toHex(incorrectPublicKey))).verify()
        expect(result.success, result.error).to.be.false
    })
})

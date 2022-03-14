const { expect } = require('chai');
const { compileContract, inputIndex, inputSatoshis, newTx } = require('../../helper');
const { buildContractClass, bsv, toHex, Bytes, Sha256, signTx, PubKeyHash, Sig, PubKey } = require('scryptlib');

const HashPuzzle = buildContractClass(compileContract('hash-puzzle-p2pkh.scrypt'))
const messageBytes = Buffer.from('hello world')
const hash = bsv.crypto.Hash.sha256(messageBytes)
const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const tx = newTx()

describe('Test HashPuzzleP2PKH', () => {

    let hashPuzzle, signature

    before(() => {
        hashPuzzle = new HashPuzzle(new Sha256(toHex(hash)), new PubKeyHash(toHex(publicKeyHash)))
        signature = signTx(tx, privateKey, hashPuzzle.lockingScript, inputSatoshis)
        hashPuzzle.txContext = { tx, inputIndex, inputSatoshis }
    })

    it('should succeed', () => {
        const result = hashPuzzle.unlock(new Bytes(toHex(messageBytes)), new Sig(toHex(signature)), new PubKey(toHex(publicKey))).verify()
        expect(result.success, result.error).to.be.true
    })

    it('should fail if passing incorrect message bytes', () => {
        const incorrectMessageBytes = Buffer.from('hello')
        const result = hashPuzzle.unlock(new Bytes(toHex(incorrectMessageBytes)), new Sig(toHex(signature)), new PubKey(toHex(publicKey))).verify()
        expect(result.success, result.error).to.be.false
    })

    it('should fail when sign with the incorrect private key', () => {
        const incorrectPrivateKey = new bsv.PrivateKey.fromRandom('testnet')
        const incorrectSignature = signTx(tx, incorrectPrivateKey, hashPuzzle.lockingScript, inputSatoshis)
        const result = hashPuzzle.unlock(new Bytes(toHex(messageBytes)), new Sig(toHex(incorrectSignature)), new PubKey(toHex(publicKey))).verify()
        expect(result.success, result.error).to.be.false
    })

    it('should fail when provide an incorrect public key', () => {
        const incorrectPublicKey = new bsv.PrivateKey.fromRandom('testnet').publicKey
        const result = hashPuzzle.unlock(new Bytes(toHex(messageBytes)), new Sig(toHex(signature)), new PubKey(toHex(incorrectPublicKey))).verify()
        expect(result.success, result.error).to.be.false
    })

    it('should succeed again', () => {
        const result = hashPuzzle.unlock(new Bytes(toHex(messageBytes)), new Sig(toHex(signature)), new PubKey(toHex(publicKey))).verify()
        expect(result.success, result.error).to.be.true
    })
})

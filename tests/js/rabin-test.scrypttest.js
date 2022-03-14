const { expect } = require('chai');
const { compileContract } = require('../../helper');
const { buildContractClass, buildTypeClasses, Bytes } = require('scryptlib');

const RabinTest = buildContractClass(compileContract('rabin-test.scrypt'))
const { RabinSig, RabinPubKey } = buildTypeClasses(RabinTest);

const messageHex = 'e8a02f6224670b0000000000044253565f555344540000000000000000'
const pubKey = 0x4d
const pk = new RabinPubKey(pubKey)
const s = 0x47
const paddingHex = '00'
const sig = new RabinSig({ s: s, padding: new Bytes(paddingHex) })

describe('Test RabinTest', () => {

    let rabinTest

    before(() => {
        rabinTest = new RabinTest()
    })

    it('should succeed', () => {
        const result = rabinTest.unlock(new Bytes(messageHex), sig, pk).verify()
        expect(result.success, result.error).to.be.true
    })

    it('should fail if passing incorrect message', () => {
        const result = rabinTest.unlock(new Bytes(messageHex + '00'), sig, pk).verify()
        expect(result.success, result.error).to.be.false
    })

    it('should fail if passing incorrect s of signature', () => {
        const incorrectSig = new RabinSig({ s: s + 1, padding: new Bytes(paddingHex) })
        const result = rabinTest.unlock(new Bytes(messageHex), incorrectSig, pk).verify()
        expect(result.success, result.error).to.be.false
    })

    it('should fail if passing incorrect padding of signature', () => {
        const incorrectSig = new RabinSig({ s: s, padding: new Bytes(paddingHex + '00') })
        const result = rabinTest.unlock(new Bytes(messageHex), incorrectSig, pk).verify()
        expect(result.success, result.error).to.be.false
    })

    it('should fail if passing incorrect public key', () => {
        const incorrectPk = new RabinPubKey(pubKey + 1)
        const result = rabinTest.unlock(new Bytes(messageHex), sig, incorrectPk).verify()
        expect(result.success, result.error).to.be.false
    })

    it('should succeed again', () => {
        const result = rabinTest.unlock(new Bytes(messageHex), sig, pk).verify()
        expect(result.success, result.error).to.be.true
    })
})

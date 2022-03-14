const { expect } = require('chai');
const { compileContract } = require('../../helper');
const { buildContractClass, bsv, toHex, Bytes, Sha256 } = require('scryptlib');

const HashPuzzle = buildContractClass(compileContract('hash-puzzle-sha256.scrypt'))
const messageBytes = Buffer.from('hello world')
const hash = bsv.crypto.Hash.sha256(messageBytes)

describe('Test HashPuzzleSha256', () => {

    let hashPuzzle

    before(() => {
        hashPuzzle = new HashPuzzle(new Sha256(toHex(hash)))
    })

    it('should succeed', () => {
        const result = hashPuzzle.unlock(new Bytes(toHex(messageBytes))).verify()
        expect(result.success, result.error).to.be.true
    })

    it('should fail if passing incorrect message bytes', () => {
        const incorrectMessageBytes = Buffer.from('hello')
        const result = hashPuzzle.unlock(new Bytes(toHex(incorrectMessageBytes))).verify()
        expect(result.success, result.error).to.be.false
    })
})

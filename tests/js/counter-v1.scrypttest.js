const { expect } = require('chai');
const { buildContractClass, bsv, getPreimage, SigHashPreimage, toHex, num2bin } = require('scryptlib');
const { compileContract, inputIndex, inputSatoshis, newTx } = require('../../helper');

const tx = newTx()
const outputAmount = 90000
const Counter = buildContractClass(compileContract('counter-v1.scrypt'))
const initialCounter = 0
const dataLen = 1

describe('Test Counter V1', () => {

    let counter, preimage

    before(() => {
        // new contract
        counter = new Counter()
        counter.setDataPart(num2bin(initialCounter, dataLen))
        // prepare unlock transaction
        const newLockingScript = [counter.codePart.toASM(), num2bin(initialCounter + 1, dataLen)].join(' ')
        tx.addOutput(new bsv.Transaction.Output({ script: bsv.Script.fromASM(newLockingScript), satoshis: outputAmount }))
        preimage = getPreimage(tx, counter.lockingScript, inputSatoshis)
        counter.txContext = { tx, inputIndex, inputSatoshis }
    })

    it('should succeed when passing correct preimage and output amount', () => {
        const result = counter.unlock(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
        expect(result.success, result.error).to.be.true
    })

    it('should fail when passing incorrect preimage', () => {
        const result = counter.unlock(new SigHashPreimage(toHex(preimage) + '01'), outputAmount).verify()
        expect(result.success, result.error).to.be.false
    })

    it('should fail when passing incorrect output amount', () => {
        const result = counter.unlock(new SigHashPreimage(toHex(preimage)), outputAmount - 1).verify()
        expect(result.success, result.error).to.be.false
    })

    it('should fail when not adding 1 to the counter', () => {
        const newLockingScript = [counter.codePart.toASM(), num2bin(initialCounter, dataLen)].join(' ')
        const t = newTx()
        t.addOutput(new bsv.Transaction.Output({ script: bsv.Script.fromASM(newLockingScript), satoshis: outputAmount }))
        const _preimage = getPreimage(t, counter.lockingScript, inputSatoshis)

        const context = { tx: t, inputIndex, inputSatoshis }
        const result = counter.unlock(new SigHashPreimage(toHex(_preimage)), outputAmount).verify(context)
        expect(result.success, result.error).to.be.false
    })
})

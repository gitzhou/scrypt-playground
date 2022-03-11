const { expect } = require('chai');
const { compileContract } = require('../../helper');
const { buildContractClass } = require('scryptlib');

const Hello = buildContractClass(compileContract('hello.scrypt'))

describe('Test Hello', () => {

    let hello

    before(() => {
        hello = new Hello(2, 3)
    })

    it('should succeed', () => {
        const result = hello.foo(5).verify()
        expect(result.success, result.error).to.be.true
    })

    it('should fail', () => {
        const result = hello.foo(6).verify()
        expect(result.success, result.error).to.be.false
    })

    it('should succeed', () => {
        const result = hello.bar(-1, 6).verify()
        expect(result.success, result.error).to.be.true
    })

    it('should fail', () => {
        const result = hello.bar(6, -1).verify()
        expect(result.success, result.error).to.be.false
    })
})

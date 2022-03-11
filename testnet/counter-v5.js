const { buildContractClass, getPreimage, toHex, bsv, SigHashPreimage, PubKey, PubKeyHash, signTx } = require('scryptlib')
const { loadDesc, showError, fetchUtxos, createInputFromPrevTx, sendTx, deployContract, sleep } = require('../helper')
const { privateKey, publicKey, publicKeyHash, address } = require('../private-key.js')

const Signature = bsv.crypto.Signature
const Counter = buildContractClass(loadDesc('counter-v5_debug_desc.json'))
const initalCounter = 0
const counter = new Counter(initalCounter, new PubKeyHash(toHex(publicKeyHash)))

const inputSatoshis = 10000
const iterations = 5

async function main() {
    console.log()
    try {
        //
        // deploy contract
        //
        const deployTx = await deployContract(counter, inputSatoshis)
        console.log('deploy:', deployTx.id)
        // avoid mempool conflicts, sleep to allow previous tx to "sink-into" the network
        await sleep(6)
        //
        // run increasement
        //
        let prevTx = deployTx
        for (i = initalCounter; i < initalCounter + iterations; i++) {
            const newLockingScript = counter.getNewStateScript({ counter: i + 1 })
            const increaseTx = new bsv.Transaction()
            increaseTx
                .addInput(createInputFromPrevTx(prevTx))
                .setInputScript(0, (tx, utxo) => {
                    const sighashType = Signature.SIGHASH_SINGLE | Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_FORKID
                    const preimage = getPreimage(tx, utxo.script, utxo.satoshis, 0, sighashType)
                    return counter.increase(new SigHashPreimage(toHex(preimage))).toScript()
                })
                .from(await fetchUtxos(address))
                .addOutput(new bsv.Transaction.Output({ script: newLockingScript, satoshis: inputSatoshis, }))
                .change(address)
                .sign(privateKey)
                .seal()
            const increaseTxid = await sendTx(increaseTx)
            console.log('increase:', increaseTxid)
            await sleep(6)
            prevTx = increaseTx
        }
        //
        // run destroy
        //
        const destroyTx = new bsv.Transaction()
        destroyTx
            .addInput(createInputFromPrevTx(prevTx))
            .setInputScript(0, (tx, utxo) => {
                const sig = signTx(tx, privateKey, utxo.script, utxo.satoshis)
                return counter.destroy(sig, new PubKey(toHex(publicKey))).toScript()
            })
            .addOutput(new bsv.Transaction.Output({ script: bsv.Script.buildPublicKeyHashOut(address), satoshis: inputSatoshis - 150 }))
            .seal()
        const destroyTxid = await sendTx(destroyTx)
        console.log('destroy:', destroyTxid)
        //
        // all good here
        //
        console.log()
        console.log('succeed on testnet')
    } catch (error) {
        console.log()
        console.log('fail on testnet')
        showError(error)
    }
}

main()

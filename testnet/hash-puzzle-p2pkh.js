const { buildContractClass, bsv, toHex, Bytes, Sha256, signTx, PubKeyHash, Sig, PubKey } = require('scryptlib');
const { loadDesc, showError, fetchUtxos, createInputFromPrevTx, sendTx, deployContract, sleep } = require('../helper')
const { privateKey, publicKey, publicKeyHash, address } = require('../private-key.js')

const HashPuzzleP2PKH = buildContractClass(loadDesc('hash-puzzle-p2pkh_debug_desc.json'))

const message = Buffer.from('Hello World')
const hash = bsv.crypto.Hash.sha256(message)
const pkh = new PubKeyHash(toHex(publicKeyHash))
const instance = new HashPuzzleP2PKH(new Sha256(toHex(hash)), pkh)

const inputSatoshis = 10000
const fees = 2000

async function main() {
    console.log()
    try {
        //
        // deploy contract
        //
        const deployTx = await deployContract(instance, inputSatoshis)
        console.log('deploy:', deployTx.id)
        // avoid mempool conflicts, sleep to allow previous tx to "sink-into" the network
        await sleep(6)
        //
        // run unlock
        //
        const unlockTx = new bsv.Transaction()
        unlockTx
            .addInput(createInputFromPrevTx(deployTx))
            .setInputScript(0, (tx, utxo) => {
                const signature = signTx(tx, privateKey, utxo.script, utxo.satoshis)
                return instance.unlock(new Bytes(toHex(message)), new Sig(toHex(signature)), new PubKey(toHex(publicKey))).toScript()
            })
            .from(await fetchUtxos(address))
            .change(address)
            .sign(privateKey)
            .seal()
        const unlockTxid = await sendTx(unlockTx)
        console.log('increase:', unlockTxid)
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

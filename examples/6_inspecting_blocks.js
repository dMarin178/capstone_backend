const { ethers } = require("ethers");

const INFURA_ID = '71c5dae369e94388a953a47b5fcf6465'
const provider = new ethers.providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${INFURA_ID}`)

const main = async () => {
    const LastBlockNumber = await provider.getBlockNumber()

    console.log(`\nBlock Number: ${LastBlockNumber}\n`)

    const blockInfo = await provider.getBlock(LastBlockNumber)

    console.log(blockInfo)

    const { transactions } = await provider.getBlockWithTransactions(LastBlockNumber)

    console.log(`\nLogging first transaction in block:\n`)
    console.log(transactions[0])
}

main()
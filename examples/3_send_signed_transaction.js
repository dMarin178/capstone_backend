const { ethers } = require("ethers");

const INFURA_ID = '71c5dae369e94388a953a47b5fcf6465'
const provider = new ethers.providers.JsonRpcProvider(`https://kovan.infura.io/v3/${INFURA_ID}`)

const account1 = '0x7dDf03e0a413d78e88c5991668eAa01369a3d564' // Your account address 1
const account2 = '0x266e413Ff1E55c3Cc65A8237bAA76D608D0a5D8a' // Your account address 2

const privateKey1 = 'a21f5a29ef835a6871c5d282b5b5436c3abaf6c0dcaddd872324e130c4f1073a' // Private key of account 1
//Wallet object to make transactions
const wallet = new ethers.Wallet(privateKey1, provider)

const main = async () => {
    
    const senderBalanceBefore = await provider.getBalance(account1)
    const recieverBalanceBefore = await provider.getBalance(account2)
    //Balance before transaction
    console.log(`\nSender balance before: ${ethers.utils.formatEther(senderBalanceBefore)}`)
    console.log(`reciever balance before: ${ethers.utils.formatEther(recieverBalanceBefore)}\n`)

    //Send Ether
    const tx = await wallet.sendTransaction({
        to: account2,
        value: ethers.utils.parseEther("0.025")
    })

    //Wait that transaction mint to the blockchain
    await tx.wait()
    //All details of the transaction
    console.log(tx)

    
    const senderBalanceAfter = await provider.getBalance(account1)
    const recieverBalanceAfter = await provider.getBalance(account2)
    //Balance after the transaction
    console.log(`\nSender balance after: ${ethers.utils.formatEther(senderBalanceAfter)}`)
    console.log(`reciever balance after: ${ethers.utils.formatEther(recieverBalanceAfter)}\n`)
}

main()
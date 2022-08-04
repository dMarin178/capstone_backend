const { ethers } = require("ethers");

const INFURA_ID = '71c5dae369e94388a953a47b5fcf6465'
const provider = new ethers.providers.JsonRpcProvider(`https://kovan.infura.io/v3/${INFURA_ID}`)

const account1 = '0x7dDf03e0a413d78e88c5991668eAa01369a3d564' // Your account address 1
const account2 = '0x266e413Ff1E55c3Cc65A8237bAA76D608D0a5D8a' // Your account address 2

const privateKey1 = 'a21f5a29ef835a6871c5d282b5b5436c3abaf6c0dcaddd872324e130c4f1073a' // Private key of account 1
const wallet = new ethers.Wallet(privateKey1, provider)

//ABI that contains the functions of the smart contract
const ERC20_ABI = [
    "function balanceOf(address) view returns (uint)",
    "function transfer(address to, uint amount) returns (bool)",
];

//Address of the ERC20 token (Link token)
const address = '0xa36085F69e2889c224210F603D836748e7dC0088'
//Object contract
const contract = new ethers.Contract(address, ERC20_ABI, provider)

const main = async () => {
    //Balance of Link token of the account1 before the tx
    const balance = await contract.balanceOf(account1)

    console.log(`\nReading from ${address}\n`)
    console.log(`Balance of sender: ${balance}\n`)

    //Connect the wallet with the contract(Link token)
    const contractWithWallet = contract.connect(wallet)

    //Transfer the tokens
    const tx = await contractWithWallet.transfer(account2, ethers.utils.parseEther("9.999999999999999990"))
    await tx.wait()

    //Print the transaction
    console.log(tx)

    //Balance of the account after the transaction
    const balanceOfSender = await contract.balanceOf(account1)
    const balanceOfReciever = await contract.balanceOf(account2)

    console.log(`\nBalance of sender: ${balanceOfSender}`)
    console.log(`Balance of reciever: ${balanceOfReciever}\n`)
}

main()
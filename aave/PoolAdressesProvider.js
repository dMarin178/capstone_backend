import { ethers, BigNumber } from "ethers";
require('dotenv').config();

const provider = new ethers.providers.JsonRpcProvider(`https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`)

/* Account that interact with AAVE
Your account address 1 */
const account1 = '0x7dDf03e0a413d78e88c5991668eAa01369a3d564';
const privateKey1 = process.env.PRIVATE_KEY;
// Connect Wallet to blockchain
const wallet = new ethers.Wallet(privateKey1, provider)

const poolAddressesProviderABI = [
    "function getPool() external view returns (address)",
];
const poolABI = [
    `function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint256 gasPrice,
      ) external virtual override `,
    "function getReserveData(address asset) external view virtual returns (DataTypes.ReserveData)",
    "function getReservesList() external view virtual override returns (address[]) ",
    `function getUserAccountData(address user)
    external
    view
    virtual
    override
    returns (
      uint256 totalCollateralBase,
      uint256 totalDebtBase,
      uint256 availableBorrowsBase,
      uint256 currentLiquidationThreshold,
      uint256 ltv,
      uint256 healthFactor
    )`,
]

//Smart Contracts
//Addresses Provider SC
const poolAdressesProvider = "0xBA6378f1c1D046e9EB0F538560BA7558546edF3C"
const poolAddressesProviderContract = new ethers.Contract(poolAdressesProvider, poolAddressesProviderABI, provider)

//WETH Smart Contract
const wethAddress = "0xD1DECc6502cc690Bc85fAf618Da487d886E54Abe"
const wethContract = new ethers.Contract(wethAddress, wethABI, provider)

//Pool Contract
const poolAddress = "0x87530ED4bd0ee0e79661D65f8Dd37538F693afD5"
const poolContract = new ethers.Contract(poolAddress, poolABI, provider)

const main = async ( ) => { 
    const poolAddress = await poolAddressesProviderContract.getPool();

    const signer = poolContract.connect(wallet)
    const wethSigner = wethContract.connect(wallet)

    const input = "0.1"; // Note: this is a string, e.g. user input
    const amount = ethers.utils.parseUnits(input, 'ether')
    //amount = amount.toString()
    //console.log(amount)
    //Transfer the tokens
    //const gasPrice = await poolContract.suply().gasPrice();
    //console.log(gasPrice.toString());

    //Deposit ETH into WETH Erc20
    const tx0 = await wethSigner.depositETH(poolAddress, account1, 0, {value: amount});
    await tx0.wait();
    console.log(tx0);


    /*
    Supply ETH to the pool
    try {
        const tx = await signer.supply(wethAddress, amount, account1, gasPrice.toString());
        await tx.wait()
        console.log(tx)    
    } catch(e){
        console.log(e)
    }

    
    Get the user account data
    try {
        const userAccountData = await poolContract.getUserAccountData(account1);
        console.log(userAccountData)
    } catch (e){
        console.log(e)
        return;
    }
    */
    
    

    //Print the transaction
    //console.log(tx)

    //Balance of the account after the transaction
    //const balanceOfSender = await contract.balanceOf(account1)
    //const balanceOfReciever = await contract.balanceOf(account2)

    //console.log(`\nBalance of sender: ${balanceOfSender}`)
    //console.log(`Balance of reciever: ${balanceOfReciever}\n`)
}

main()
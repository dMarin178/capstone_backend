import ethers from "ethers";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const provider = new ethers.providers.JsonRpcProvider(
  "https://goerli.infura.io/v3/c017b294161a4c638a3fb2d0910fe2a9"
);

const storageAddress = "0x047Ce832cEaBbd36b16cc93d88bE61f28982Edd2";
const storageAbi = [
  "event Received(address from, uint256 amount)",
  "function withdraw(uint _amount) external",
  "function getBalance() view returns (uint)",
];

const storageContract = new ethers.Contract(
  storageAddress,
  storageAbi,
  provider
);

const address2 = "0x082C0A8d1209D4e9De0E9948FE56287A4e9D9f7b"

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const sendEth = async (amount) => {
    await getBalance().then((balance) => {
        console.log(`Balance antes de transferir ${amount}: ${balance} ETH`);
    });
  try {
    const sendEthToStorage = await wallet.sendTransaction({
      to: storageAddress,
      value: ethers.utils.parseEther(amount),
    });
    await sendEthToStorage.wait().then((tx) => {
        console.log(`Status: ${tx.status}`);
    });
    
    await getBalance().then((balance) => {
        console.log(`Balance despues de transferir ${amount}: ${balance} ETH`);
    });
  } catch (err) {
    console.log(err);
  }
};

const getBalance = async () => {
  try {
    const walletStorageBalance = await storageContract.getBalance();
    const balance = ethers.utils.formatEther(walletStorageBalance, "wei");
    //console.log(`El balance de la billetera de almacenamiento es: ${balance} ETH`);;
    return balance;
  } catch (err) {
    console.log(err);
  }
};

const withdraw = async ( userWallet , amount) => {
    const storageBalance = await getBalance();
    if( storageBalance < amount ) return ("Exedido el limite de retiro");

    await getBalance().then((balance) => {
        console.log(`Balance antes de retirar ${amount}: ${balance} ETH`);
    });
    try{
        const parsedAmount = ethers.utils.parseEther(amount);
        const signWithdraw = storageContract.connect(userWallet);
        const widthdrawTx = await signWithdraw.withdraw( parsedAmount, {
            gasLimit: 360000,
        });
        await widthdrawTx.wait().then( (tx)=> {
            console.log(`Status: ${tx.status}`);
        });
        await getBalance().then((balance) => {
            console.log(`Balance despues de transferir ${amount}: ${balance} ETH`);
        });
    } catch (err){
        console.log(err);
    }
}

withdraw( wallet , "0.1");

//sendEth("0.1");

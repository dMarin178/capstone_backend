import { ethers, utils } from "ethers";
import pkg from "@aave/contract-helpers";
let ChainId = pkg.ChainId;
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import fs from "fs";

const transactionCost = {
  ethTransfer: 270000,
  erc20Aproval: 450000,
  erc20Transfer: 650000,
};
const provider = new ethers.providers.JsonRpcProvider(
  `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`
);

const wethGatewayAddress = "0xd5B55D3Ed89FDa19124ceB5baB620328287b915d";
const poolAddressessProviderAddress =
  "0xc4dCB5126a3AfEd129BC3668Ea19285A9f56D15D";
const walletBalanceProviderAddress =
  "0x75CC0f0E3764be7594772D08EEBc322970CbB3a9";
const aWethAddress = "0x27B4692C93959048833f40702b22FE3578E77759";

const walletBalanceProviderAbi = fs.readFileSync(
  "../ABIs/walletBalanceProvider.abi",
  "utf-8"
);

const poolAddressesProviderAbi = [
  "function getPool() external view returns (address)",
];

const wethAbi = [
  "function depositETH(address pool, address onBehalfOf, uint16 referralCode) public payable returns (uint256)",
  "function withdrawETH(address pool, uint256 amount, address onBehalfOf) public returns (uint256)",
  "function borrowETH(address pool, uint256 amount, uint16 interestRateMode, uint16 referralCode) public payable returns (uint256)",
];

//Contrato poolAddressesProvider
const poolAddressesProviderContract = new ethers.Contract(
  poolAddressessProviderAddress,
  poolAddressesProviderAbi,
  provider
);

//Contrato wethGateway
const wethGateway = new ethers.Contract(wethGatewayAddress, wethAbi, provider);

//User Wallet object
let wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
//const poolContract = pool.connect(wallet);

//User balance of a token
const getTokenBalance = async (userAddress, tokenAddress) => {
  try {
    //creacion de contrato walletBalanceProvider
    const balanceWalletContract = new ethers.Contract(
      walletBalanceProviderAddress,
      walletBalanceProviderAbi,
      provider
    );
    //Llmada a la funcion getTokenBalance
    //Balance de un token en una wallet 
    const userTokenBalanceHex = await balanceWalletContract.balanceOf(
      userAddress,
      tokenAddress
    );
    //Formateamos a ether
    const userTokenBalanceInEth = utils.formatEther(userTokenBalanceHex, "wei");
    return Number(userTokenBalanceInEth);
  } catch (err) {
    console.log(err);
  }
};

const depositETH = async (quantity) => {
  const balance = await provider.getBalance(process.env.USER_ADDRESS);
  const balanceInEth = Number(utils.formatEther(balance, "wei"));
  const txFeeInEth = Number(
    utils.formatEther(transactionCost.ethTransfer, "gwei")
  );

  //Verificamos que el balance sea suficiente
  if (balanceInEth < quantity + txFeeInEth) {
    console.log("No tienes suficientes ether para depositar");
    return 0;
  }

  try {
    const poolAddress = await poolAddressesProviderContract.getPool();
    //const gasPrice = await wethGateway.gasPrice();
    //console.log(gasPrice)
    const wethGatewayContract = wethGateway.connect(wallet);
    const tx0 = await wethGatewayContract.depositETH(
      poolAddress,
      process.env.USER_ADDRESS,
      0,
      {
        value: utils.parseUnits(quantity, "ether"),
        gasLimit: 310000,
      }
    );
    await tx0.wait();
    console.log(tx0);
  } catch (err) {
    console.log(err);
  }
};

const withdrawETH = async (quantity) => {
  const aWETHBalance = await getTokenBalance(
    process.env.USER_ADDRESS,
    aWethAddress
  );

  if (aWETHBalance < Number(quantity)) {
    console.log("No puedes retirar esa cantidad de ETH");
    return 0;
  }

  try {
    const wethGatewayContract = wethGateway.connect(wallet);
    const poolAddress = await poolAddressesProviderContract.getPool();

    const tx0 = await wethGatewayContract.withdrawETH(
      poolAddress,
      ethers.utils.parseUnits(quantity, "ether"),
      process.env.USER_ADDRESS
    );
    await tx0.wait();
    console.log(tx0);
  } catch (err) {
    console.log(err);
  }
};

async function borrowETH(amount, interesRateMode, referalCode) {
  try {
    const poolAddress = await poolAddressesProviderContract.getPool();
    const wethGatewayContract = wethGateway.connect(wallet);
    const tx0 = await wethGatewayContract.borrowETH(
      poolAddress,
      ethers.utils.parseUnits(amount, "ether"),
      interesRateMode,
      referalCode,
      {
        gasLimit: 210000,
      }
    );
    await tx0.wait();
    console.log(tx0);
  } catch (err) {
    console.log(err);
  }
}

//depositETH("0.2")

//withdrawETH( "0.2" );

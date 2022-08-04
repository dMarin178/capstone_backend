import { ethers } from "ethers";
import fs from "fs";
import dayjs from "dayjs";
import helpers from "@aave/contract-helpers";
import mathUtils from "@aave/math-utils";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });
let ChainId = helpers.ChainId;
let UiPoolDataProvider = helpers.UiPoolDataProvider;
let UiIncentiveDataProvider = helpers.UiIncentiveDataProvider;
let formatReserves = mathUtils.formatReserves;
let formatReservesAndIncentives = mathUtils.formatReservesAndIncentives;
let formatUserSummary = mathUtils.formatUserSummary;
let formatUserSummaryAndIncentives = mathUtils.formatUserSummaryAndIncentives;

// This is the provider used in Aave UI, it checks the chainId locally
// to reduce RPC calls with frequent network switches, but requires that
// the rpc url and chainId to remain consistent with the request being
// sent from the wallet (i.e. actively detecting the active chainId)
const provider = new ethers.providers.StaticJsonRpcProvider(
  "https://goerli.infura.io/v3/c017b294161a4c638a3fb2d0910fe2a9",
  ChainId.goerli
);

const uiIncentiveDataProviderAddress =
  "0x2A15b87783b9d590a6c528E7b1Df71ee73540F5A";
const poolAddressesProviderAddress =
  "0xc4dCB5126a3AfEd129BC3668Ea19285A9f56D15D";
const daiUnderlyingAsset = "0xdf1742fe5b0bfc12331d8eaec6b478dfdbd31464";

let poolAddressesProviderAbi = [
  "function getPool() external view returns (address)",
];

const poolAbi = fs.readFileSync("../ABIs/pool.abi", "utf-8");

const daiAbi = [
  "function approve( address spender, uint256 amount) public returns (bool)",
];

const uiIncentiveDataProviderAbi = [
  `function getUserReservesIncentivesData(IPoolAddressesProvider provider, address user) external view returns (UserReserveIncentiveData[] memory)`,
];

class DataProvider {
  constructor(chainId, provider, currentTimeStamp) {
    this.chanId = chainId;
    this.provider = provider;
    this.currentTimeStamp = currentTimeStamp;
    this.uiPoolDataProviderAddress =
      "0x851F44e30C469b9E4Bf9591309611c28eAb85fAb";
    this.uiIncentiveDataProviderAddress =
      "0x2A15b87783b9d590a6c528E7b1Df71ee73540F5A";
    this.lendingPoolAddressProvider =
      "0xc4dCB5126a3AfEd129BC3668Ea19285A9f56D15D";
    this.poolDataProvider = new UiPoolDataProvider({
      uiPoolDataProviderAddress: this.uiPoolDataProviderAddress,
      provider: this.provider,
      chainId: this.chanId,
    });
    this.incentivesDataProvider = new UiIncentiveDataProvider({
      uiIncentiveDataProviderAddress: this.uiIncentiveDataProviderAddress,
      provider: this.provider,
      chainId: this.chanId,
    });
  }

  getUserData = async (currentAccount) => {
    // Note, contract calls should be performed in an async block, and updated on interval or on network/market change

    // Object containing array of pool reserves and market base currency data
    // { reservesArray, baseCurrencyData }
    const reserves = await this.poolDataProvider.getReservesHumanized({
      lendingPoolAddressProvider: this.lendingPoolAddressProvider,
    });

    // Object containing array or users aave positions and active eMode category
    // { userReserves, userEmodeCategoryId }
    const userReserves = await this.poolDataProvider.getUserReservesHumanized({
      lendingPoolAddressProvider: this.lendingPoolAddressProvider,
      user: currentAccount,
    });

    // Array of incentive tokens with price feed and emission APR
    const reserveIncentives =
      await this.incentivesDataProvider.getReservesIncentivesDataHumanized({
        lendingPoolAddressProvider: this.lendingPoolAddressProvider,
      });

    // Dictionary of claimable user incentives
    const userIncentives =
      await this.incentivesDataProvider.getUserReservesIncentivesDataHumanized({
        lendingPoolAddressProvider: this.lendingPoolAddressProvider,
        user: currentAccount,
      });

    const reservesArray = reserves.reservesData;
    const baseCurrencyData = reserves.baseCurrencyData;

    const currentTimestamp = dayjs().unix();

    /*
    - @param `reserves` Input from [Fetching Protocol Data](#fetching-protocol-data), `reserves.reservesArray`
    - @param `currentTimestamp` Current UNIX timestamp in seconds
    - @param `marketReferencePriceInUsd` Input from [Fetching Protocol Data](#fetching-protocol-data), `reserves.baseCurrencyData.marketReferencePriceInUsd`
    - @param `marketReferenceCurrencyDecimals` Input from [Fetching Protocol Data](#fetching-protocol-data), `reserves.baseCurrencyData.marketReferenceCurrencyDecimals`
    */
    const formattedPoolReserves = formatReserves({
      reserves: reservesArray,
      currentTimestamp,
      marketReferenceCurrencyDecimals:
        baseCurrencyData.marketReferenceCurrencyDecimals,
      marketReferencePriceInUsd:
        baseCurrencyData.marketReferenceCurrencyPriceInUsd,
    });

    /*
    - @param `reserves` Input from [Fetching Protocol Data](#fetching-protocol-data), `reserves.reservesArray`
    - @param `currentTimestamp` Current UNIX timestamp in seconds, Math.floor(Date.now() / 1000)
    - @param `marketReferencePriceInUsd` Input from [Fetching Protocol Data](#fetching-protocol-data), `reserves.baseCurrencyData.marketReferencePriceInUsd`
    - @param `marketReferenceCurrencyDecimals` Input from [Fetching Protocol Data](#fetching-protocol-data), `reserves.baseCurrencyData.marketReferenceCurrencyDecimals`
    - @param `reserveIncentives` Input from [Fetching Protocol Data](#fetching-protocol-data), `reserveIncentives`
    */
    const formattedPoolReservesAndIncentives = formatReservesAndIncentives({
      reserves: reservesArray,
      currentTimestamp,
      marketReferencePriceInUsd:
        baseCurrencyData.marketReferenceCurrencyPriceInUsd,
      marketReferenceCurrencyDecimals:
        baseCurrencyData.marketReferenceCurrencyDecimals,
      reserveIncentives,
    });

    // USER DATA
    /* 
  Formatted user data is an object containing cumulative metrics 
  (healthFactor, totalLiquidity, totalBorrows, etc.) and an array 
  of formatted reserve data plus user holdings (aTokens, debtTokens) 
  for each reserve in an Aave market

  formatUserSummary
  Returns formatted summary of Aave user portfolio including: array 
  of holdings, total liquidity, total collateral, total borrows, 
  liquidation threshold, health factor, and available borrowing power
  */

    const userReservesArray = userReserves.userReserves;

    /*
    - @param `currentTimestamp` Current UNIX timestamp in seconds, Math.floor(Date.now() / 1000)
    - @param `marketReferencePriceInUsd` Input from [Fetching Protocol Data](#fetching-protocol-data), `reserves.baseCurrencyData.marketReferencePriceInUsd`
    - @param `marketReferenceCurrencyDecimals` Input from [Fetching Protocol Data](#fetching-protocol-data), `reserves.baseCurrencyData.marketReferenceCurrencyDecimals`
    - @param `userReserves` Input from [Fetching Protocol Data](#fetching-protocol-data), combination of `userReserves.userReserves` and `reserves.reservesArray`
    - @param `userEmodeCategoryId` Input from [Fetching Protocol Data](#fetching-protocol-data), `userReserves.userEmodeCategoryId`
    */
    const userSummary = formatUserSummary({
      currentTimestamp,
      marketReferencePriceInUsd:
        baseCurrencyData.marketReferenceCurrencyPriceInUsd,
      marketReferenceCurrencyDecimals:
        baseCurrencyData.marketReferenceCurrencyDecimals,
      userReserves: userReservesArray,
      formattedReserves: formattedPoolReserves,
      userEmodeCategoryId: userReserves.userEmodeCategoryId,
    });

    //console.log(userSummary);

    /*
    - @param `currentTimestamp` Current UNIX timestamp in seconds, Math.floor(Date.now() / 1000)
    - @param `marketReferencePriceInUsd` Input from [Fetching Protocol Data](#fetching-protocol-data), `reserves.baseCurrencyData.marketReferencePriceInUsd`
    - @param `marketReferenceCurrencyDecimals` Input from [Fetching Protocol Data](#fetching-protocol-data), `reserves.baseCurrencyData.marketReferenceCurrencyDecimals`
    - @param `userReserves` Input from [Fetching Protocol Data](#fetching-protocol-data), combination of `userReserves.userReserves` and `reserves.reservesArray`
    - @param `userEmodeCategoryId` Input from [Fetching Protocol Data](#fetching-protocol-data), `userReserves.userEmodeCategoryId`
    - @param `reserveIncentives` Input from [Fetching Protocol Data](#fetching-protocol-data), `reserveIncentives`
    - @param `userIncentives` Input from [Fetching Protocol Data](#fetching-protocol-data), `userIncentives`
    */
    const userSummaryAndIncentives = formatUserSummaryAndIncentives({
      currentTimestamp,
      marketReferencePriceInUsd:
        baseCurrencyData.marketReferenceCurrencyPriceInUsd,
      marketReferenceCurrencyDecimals:
        baseCurrencyData.marketReferenceCurrencyDecimals,
      userReserves: userReservesArray,
      formattedReserves: formattedPoolReservesAndIncentives,
      userEmodeCategoryId: userReserves.userEmodeCategoryId,
      reserveIncentives,
      userIncentives,
    });

    return {
      //summary: userSummary,
      summaryAndIncentives: userSummaryAndIncentives,
    };
  };
}

const dataProvider = new DataProvider(ChainId.goerli, provider, Date.now());

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const getUserAvailableBorrowUSD = async (userAddress) => {
  try {
    const userData = await dataProvider.getUserData(userAddress);
    const userSummaryAndIncentives = userData.summaryAndIncentives;
    return userSummaryAndIncentives.availableBorrowsUSD;
  } catch (err) {
    console.log(err);
  }
};

const poolAddressesProviderContract = new ethers.Contract(
  poolAddressesProviderAddress,
  poolAddressesProviderAbi,
  provider
);

const borrow = async (amount) => {
  const availableBorrowUSD = await getUserAvailableBorrowUSD(
    process.env.USER_ADDRESS
  );
  if (Number(amount) > Number(availableBorrowUSD)) {
    console.log("No tienes suficiente collateral para este préstamo");
    return 0;
  }

  try {
    //Fetch the pool address from the poolAddressesProvider
    const poolAddress = await poolAddressesProviderContract.getPool();
    const poolContract = new ethers.Contract(poolAddress, poolAbi, provider);
    const poolContractWallet = poolContract.connect(wallet);

    const tx1 = await poolContractWallet.borrow(
      daiUnderlyingAsset,
      ethers.utils.parseUnits(amount, "ether"),
      2,
      0,
      process.env.USER_ADDRESS,
      {
        //gasPrice: ethers.utils.parseUnits("100", "gwei"),
        gasLimit: 360000,
      }
    );
    await tx1.wait();
    console.log(tx1);
  } catch (e) {
    console.log(e);
  }
};

const withdraw = async (amount) => {
  try {
    //Fetch the pool address from the poolAddressesProvider
    const poolAddress = await poolAddressProviderContract.getPool();

    const poolContract = new ethers.Contract(poolAddress, poolAbi, provider);
    const poolContractWallet = poolContract.connect(wallet);

    //console.log(process.env.USER_ADDRESS)
    //console.log(poolAddress)
    const tx1 = await poolContractWallet.withdraw(
      daiUnderlyingAsset,
      ethers.utils.parseUnits(amount, "ether"),
      process.env.USER_ADDRESS,
      {
        //gasPrice: ethers.utils.parseUnits("100", "gwei"),
        gasLimit: 3600000,
      }
    );
    await tx1.wait();
    console.log(tx1);
  } catch (e) {
    console.log(e);
  }
};

async function repay(amount) {
  try {
    //Fetch the pool address from the poolAddressesProvider
    const poolAddress = await poolAddressesProviderContract.getPool();

    const DaiContract = new ethers.Contract(
      daiUnderlyingAsset,
      daiAbi,
      provider
    );

    const underlyngDaiContractWallet = DaiContract.connect(wallet);
    const txAprove = await underlyngDaiContractWallet.approve(
      process.env.USER_ADDRESS,
      ethers.utils.parseUnits(amount, "ether")
    );
    await txAprove.wait();
    console.log(txAprove);
    
    const txAproveHash = txAprove.hash;
    const txAproveReceipt = await provider.getTransactionReceipt(txAproveHash);
    
    if( txAproveReceipt.status !== 1 ) return console.log("Approved DAI failed");
    console.log("Approved DAI done");

    const poolContract = new ethers.Contract(poolAddress, poolAbi, provider);
    const poolContractWallet = poolContract.connect(wallet);

    const tx1 = await poolContractWallet.repay(
      daiUnderlyingAsset,
      ethers.utils.parseUnits(amount, "ether"),
      2,
      process.env.USER_ADDRESS,
      {
        //gasPrice: ethers.utils.parseUnits("100", "gwei"),
        gasLimit: 360000,
      }
    );
    await tx1.wait();
    console.log(tx1);
  } catch (e) {
    console.log(e);
  }
}

repay("100");

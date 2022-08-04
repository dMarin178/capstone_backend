import { ethers } from "ethers";
import pkg from "@aave/contract-helpers";
import math_pkg from "@aave/math-utils";
import dayjs from "dayjs";
const { UiPoolDataProvider, UiIncentiveDataProvider, ChainId, WalletBalanceProvider } = pkg;
const { formatReserves, formatReservesAndIncentives, formatUserSummary, formatUserSummaryAndIncentives } =
  math_pkg;
import dotenv from "dotenv";
dotenv.config();

infuraKey = process.env.INFURA_KEY;
// Sample RPC address for querying ETH mainnet
let provider = new ethers.providers.JsonRpcProvider(
  `https://goerli.infura.io/v3/${infuraKey}`
);

// This is the provider used in Aave UI, it checks the chainId locally to reduce RPC calls with frequent network switches, but requires that the rpc url and chainId to remain consistent with the request being sent from the wallet (i.e. actively detecting the active chainId)
provider = new ethers.providers.StaticJsonRpcProvider(
  `https://goerli.infura.io/v3/${infuraKey}`,
  ChainId.goerli
);

// Aave protocol contract addresses, will be different for each market and can be found at https://docs.aave.com/developers/deployed-contracts/deployed-contracts
// For V3 Testnet Release, contract addresses can be found here https://github.com/aave/aave-ui/blob/feat/arbitrum-clean/src/ui-config/markets/index.ts
const uiPoolDataProviderAddress = "0x851F44e30C469b9E4Bf9591309611c28eAb85fAb";
const uiIncentiveDataProviderAddress = "0x2A15b87783b9d590a6c528E7b1Df71ee73540F5A";
const lendingPoolAddressProvider = "0xc4dCB5126a3AfEd129BC3668Ea19285A9f56D15D";
const walletBalanceProviderAddress = "0x75CC0f0E3764be7594772D08EEBc322970CbB3a9";
//const walletBalanceProvider = fs.readFileSync("ABIs/walletBalanceProvider.abi", "utf-8");

// User address to fetch data for
const user = "0x7dDf03e0a413d78e88c5991668eAa01369a3d564";
console.log(ethers.utils.isAddress(user));

async function main() {
  // View contract used to fetch all reserves data (including market base currency data), and user reserves
  const poolDataProviderContract = new UiPoolDataProvider({
    uiPoolDataProviderAddress,
    provider,
    chainId: ChainId.goerli,
  });

  // View contract used to fetch all reserve incentives (APRs), and user incentives
  const incentiveDataProviderContract = new UiIncentiveDataProvider({
    uiIncentiveDataProviderAddress,
    provider,
    chainId: ChainId.goerli,
  });

  /* const walletBalanceProvider = new WalletBalanceProvider({
    walletBalanceProviderAddress,
    provider,
  });

  const allUserBalance = await walletBalanceProvider.getUserWalletBalancesForLendingPoolProvider({
    user,
    lendingPoolAddressProvider,
  });
 */
  

  // Note, contract calls should be performed in an async block, and updated on interval or on network/market change

  // Object containing array of pool reserves and market base currency data
  // { reservesArray, baseCurrencyData }
  const reserves = await poolDataProviderContract.getReservesHumanized({
    lendingPoolAddressProvider,
  });

  // Object containing array or users aave positions and active eMode category
  // { userReserves, userEmodeCategoryId }
  const userReserves = await poolDataProviderContract.getUserReservesHumanized({
    lendingPoolAddressProvider,
    user,
  });

  // Array of incentive tokens with price feed and emission APR
  const reserveIncentives =
    await incentiveDataProviderContract.getReservesIncentivesDataHumanized({
      lendingPoolAddressProvider,
    });

  // Dictionary of claimable user incentives
  const userIncentives =
    await incentiveDataProviderContract.getUserReservesIncentivesDataHumanized({
      lendingPoolAddressProvider,
      user,
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
    marketReferencePriceInUsd: baseCurrencyData.marketReferenceCurrencyPriceInUsd,
    marketReferenceCurrencyDecimals: baseCurrencyData.marketReferenceCurrencyDecimals,
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

  //console.log(userIncentives);
}

main();

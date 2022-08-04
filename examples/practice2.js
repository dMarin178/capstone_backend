import { ethers } from "ethers";
import pkg from "@aave/contract-helpers";
import math_pkg from "@aave/math-utils";
import dayjs from "dayjs";
import fs from "fs";
let UiPoolDataProvider = pkg.UiPoolDataProvider;
let UiIncentiveDataProvider = pkg.UiIncentiveDataProvider;
let ChainId = pkg.ChainId;
import dotenv from "dotenv";
dotenv.config({ silent: process.env.NODE_ENV === 'production' });

// Sample RPC address for querying ETH mainnet
let provider = new ethers.providers.JsonRpcProvider(
    'https://rinkeby.infura.io/v3/8da85d1592a349e8aedd0b1109e67d26',
  );
  
  // This is the provider used in Aave UI, it checks the chainId locally to reduce RPC calls with frequent network switches, but requires that the rpc url and chainId to remain consistent with the request being sent from the wallet (i.e. actively detecting the active chainId)
provider = new ethers.providers.StaticJsonRpcProvider(
    'https://rinkeby.infura.io/v3/8da85d1592a349e8aedd0b1109e67d26',
    ChainId.rinkeby,
  );

// Aave protocol contract addresses, will be different for each market and can be found at https://docs.aave.com/developers/deployed-contracts/deployed-contracts
// For V3 Testnet Release, contract addresses can be found here https://github.com/aave/aave-ui/blob/feat/arbitrum-clean/src/ui-config/markets/index.ts
const uiPoolDataProviderAddress =
  "0x550f9764d56291B5B793b6dD1623af3346128BD2".toLowerCase();
const uiIncentiveDataProviderAddress =
  "0x2c9f31b1F9838Bb8781bb61a0d0a4615f6530207".toLowerCase();
const lendingPoolAddressProvider =
  "0xBA6378f1c1D046e9EB0F538560BA7558546edF3C".toLowerCase();
const wethAbi = fs.readFileSync("ABIs/wethGateway.abi", "utf-8");
const poolAbi = fs.readFileSync("ABIs/pool.abi", "utf-8");
const erc20Abi = fs.readFileSync("ABIs/erc20.abi", "utf-8");
// User address to fetch data for
const user = process.env.USER_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;

async function main() {
  // Helper contract, used by Aave UI, to fetch Pool Data 
  //such reserves list, all reserves data like liquidity, token addresses, rate strategy etc.
  const poolDataProviderContract = new UiPoolDataProvider({
    uiPoolDataProviderAddress,
    provider,
  });

  //Helper contract to fetch Incentive data. It is used by Aave UI for reward balance info.
  const incentiveDataProviderContract = new UiIncentiveDataProvider({
    uiIncentiveDataProviderAddress,
    provider,
  });

  const reserves = await poolDataProviderContract.getReservesHumanized({
    lendingPoolAddressProvider,
  });

  let paramter = {
    lendingPoolAddressProvider,
    user,
  };
  
  console.log(paramter);
  const userReserves = await poolDataProviderContract.getUserReservesHumanized(
    paramter
  );

  // // Array of incentive tokens with price feed and emission APR
  const reserveIncentives =
    await incentiveDataProviderContract.getReservesIncentivesDataHumanized({
      lendingPoolAddressProvider,
  });
  //console.log(reserveIncentives);

  // Dictionary of claimable user incentives
  const userIncentives =
    await incentiveDataProviderContract.getUserReservesIncentivesDataHumanized({
      lendingPoolAddressProvider,
      user,
    });

  //console.log(userIncentives);

  let formatReserves = math_pkg.formatReserves;
  let formatReservesAndIncentives = math_pkg.formatReservesAndIncentives;
  let formatUserSummary = math_pkg.formatUserSummary;
  // reserves input from Fetching Protocol Data section

  const reservesArray = reserves.reservesData;
  const baseCurrencyData = reserves.baseCurrencyData;

  const currentTimestamp = dayjs().unix();

  /*
- @param `reserves` Input from [Fetching Protocol Data](#fetching-protocol-data), `reserves.reservesArray`
- @param `currentTimestamp` Current UNIX timestamp in seconds
- @param `marketReferencePriceInUsd` Input from [Fetching Protocol Data](#fetching-protocol-data), `reserves.baseCurrencyData.marketReferencePriceInUsd`
- @param `marketReferenceCurrencyDecimals` Input from [Fetching Protocol Data](#fetching-protocol-data), `reserves.baseCurrencyData.marketReferenceCurrencyDecimals`
*/
  const formattedReserves = formatReserves({
    reserves: reservesArray,
    currentTimestamp,
    marketReferenceCurrencyDecimals:
      baseCurrencyData.marketReferenceCurrencyDecimals,
    marketReferencePriceInUsd:
      baseCurrencyData.marketReferenceCurrencyPriceInUsd,
  });

  //console.log(reservesArray);

  const formatReservesAndIncent = formatReservesAndIncentives({
    reserves: reservesArray,  
    currentTimestamp,
    marketReferenceCurrencyDecimals:
      baseCurrencyData.marketReferenceCurrencyDecimals,
    marketReferencePriceInUsd:
      baseCurrencyData.marketReferenceCurrencyPriceInUsd,
    reserveIncentives,
  });

  

  const userReservesArray = userReserves.userReserves;
  const userSummary = formatUserSummary({
    currentTimestamp,
    marketReferencePriceInUsd:
      baseCurrencyData.marketReferenceCurrencyPriceInUsd,
    marketReferenceCurrencyDecimals:
      baseCurrencyData.marketReferenceCurrencyDecimals,
    userReserves: userReservesArray,
    formattedReserves,
    userEmodeCategoryId: userReserves.userEmodeCategoryId,
  });

  //console.log("userSummary", userSummary);

}

main();

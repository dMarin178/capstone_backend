import { ethers } from "ethers";
import pkg from "@aave/contract-helpers";
import math_pkg from "@aave/math-utils";
import dayjs from "dayjs";
const { UiPoolDataProvider, UiIncentiveDataProvider, ChainId } = pkg;
const {
  formatReserves,
  formatReservesAndIncentives,
  formatUserSummary,
  formatUserSummaryAndIncentives,
} = math_pkg;

class DataProvider {
  constructor(chainId, provider, currentTimeStamp) {
    this.chanId = chainId;
    this.provider = provider;
    this.currentTimeStamp = currentTimeStamp;
    this.uiPoolDataProviderAddress =
      "0x550f9764d56291B5B793b6dD1623af3346128BD2";
    this.uiIncentiveDataProviderAddress =
      "0x2c9f31b1F9838Bb8781bb61a0d0a4615f6530207";
    this.lendingPoolAddressProvider =
      "0xBA6378f1c1D046e9EB0F538560BA7558546edF3C";
    this.poolDataProvider = new UiPoolDataProvider({
      uiPoolDataProviderAddress: this.uiPoolDataProviderAddress,
      provider: this.provider,
      chainId: ChainId.rinkeby,
    });
    this.incentivesDataProvider = new UiIncentiveDataProvider({
      uiIncentiveDataProviderAddress: this.uiIncentiveDataProviderAddress,
      provider: this.provider,
      chainId: ChainId.rinkeby,
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
    const userReserves =
      await this.poolDataProvider.getUserReservesHumanized({
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
      await this.incentivesDataProvider.getUserReservesIncentivesDataHumanized(
        {
          lendingPoolAddressProvider: this.lendingPoolAddressProvider,
          user: currentAccount,
        }
      );

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
      summary: userSummary,
      summaryAndIncentives: userSummaryAndIncentives,
    };
  };
}

export { DataProvider };

const main = async () => {
  const provider = new ethers.providers.StaticJsonRpcProvider(
    "https://rinkeby.infura.io/v3/8da85d1592a349e8aedd0b1109e67d26",
    ChainId.rinkeby
  );
  const currentTimestamp = dayjs().unix();
  const dataProvider = new DataProvider(
    ChainId.rinkeby,
    provider,
    currentTimestamp
  );
  const summaryAndIncentives = await dataProvider.getUserData(
    "0x7dDf03e0a413d78e88c5991668eAa01369a3d564"
  );
  //const totalLiquidity = summaryAndIncentives.totalLiquidityMarketReferenceCurrency;
  console.log(summaryAndIncentives);
};

main();

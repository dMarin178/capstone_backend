import { ethers } from "ethers";
import pkg from "@aave/contract-helpers";
import math_pkg from "@aave/math-utils";
import fs from "fs";
import dayjs from "dayjs";
const { UiPoolDataProvider, UiIncentiveDataProvider, ChainId, WalletBalanceProvider } = pkg;
const { formatReserves, formatReservesAndIncentives, formatUserSummary, formatUserSummaryAndIncentives } =
  math_pkg;
import dotenv from "dotenv";
dotenv.config();

// This is the provider used in Aave UI, it checks the chainId locally to reduce RPC calls with frequent network switches, but requires that the rpc url and chainId to remain consistent with the request being sent from the wallet (i.e. actively detecting the active chainId)
const provider = new ethers.providers.StaticJsonRpcProvider(
    "https://goerli.infura.io/v3/c017b294161a4c638a3fb2d0910fe2a9",
    ChainId.goerli
  );

const uiPoolDataProviderAddress = "0x851F44e30C469b9E4Bf9591309611c28eAb85fAb";
const uiIncentiveDataProviderAddress = "0x2A15b87783b9d590a6c528E7b1Df71ee73540F5A";
const lendingPoolAddressProvider = "0xc4dCB5126a3AfEd129BC3668Ea19285A9f56D15D";
const walletBalanceProviderAddress = "0x75CC0f0E3764be7594772D08EEBc322970CbB3a9";
const walletBalanceProviderAbi = fs.readFileSync("ABIs/walletBalanceProvider.abi", "utf-8");

  // User address to fetch data for
const user = "0x7dDf03e0a413d78e88c5991668eAa01369a3d564";
console.log(ethers.utils.isAddress(user));

const walletBalanceProvider = new ethers.Contract(walletBalanceProviderAddress, walletBalanceProviderAbi, provider);

async function main() {

    const userBalance = await walletBalanceProvider.getUserWalletBalances( lendingPoolAddressProvider ,user);
    
    const bigNumber = ethers.BigNumber.from(userBalance[1][0]);
    const hexBalance = (userBalance[1][0])._hex
    console.log(bigNumber.toString());
    
}

main();



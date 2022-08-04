import ethers from "ethers";
import pkgContractHelpers from "@aave/contract-helpers";
const { UiPoolDataProvider, UiIncentiveDataProvider, ChainId } =
  pkgContractHelpers;
import pkgMathUtils from "@aave/math-utils";
const { formatReserves, formatReservesAndIncentives, formatUserSummary } =
  pkgMathUtils;
import dayjs from "dayjs";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

// Sample RPC address for querying ETH mainnet
let provider = new ethers.providers.JsonRpcProvider(
  "https://rinkeby.infura.io/v3/8da85d1592a349e8aedd0b1109e67d26"
);

// This is the provider used in Aave UI, it checks the chainId locally to reduce RPC calls with frequent network switches, but requires that the rpc url and chainId to remain consistent with the request being sent from the wallet (i.e. actively detecting the active chainId)
provider = new ethers.providers.StaticJsonRpcProvider(
  "https://rinkeby.infura.io/v3/8da85d1592a349e8aedd0b1109e67d26",
  ChainId.rinkeby
);

//Import the addresses of the contracts
const uiPoolDataProviderAddress =
  "0x550f9764d56291B5B793b6dD1623af3346128BD2".toLowerCase();
const uiIncentiveDataProviderAddress =
  "0x550f9764d56291B5B793b6dD1623af3346128BD2".toLowerCase();
const lendingPoolAddressProvider =
  "0xBA6378f1c1D046e9EB0F538560BA7558546edF3C".toLowerCase();
const wethGatewayAddress =
  "0xD1DECc6502cc690Bc85fAf618Da487d886E54Abe".toLowerCase();
const poolAddress = "0xE039BdF1d874d27338e09B55CB09879Dedca52D8".toLowerCase();
const daiReserve = "0x4aAded56bd7c69861E8654719195fCA9C670EB45".toLowerCase();
const wethABI = fs.readFileSync("ABIs/wethGateway.abi", "utf-8");
const poolABI = fs.readFileSync("ABIs/pool.abi", "utf-8");
const erc20Abi = fs.readFileSync("ABIs/erc20.abi", "utf-8");
// User address to fetch data for
const user = process.env.USER_ADDRESS;
const privareKey = process.env.PRIVATE_KEY;

/* The following code is used to connect with the UiPoolDataProvider contract
and fetch overall crypto reserves in the pool as well as reserves belonging to a specific user.\
*/
//provedor de datos de las pools
const PoolDataProviderContract = new UiPoolDataProvider({
  uiPoolDataProviderAddress,
  provider,
});

//Contrato de proveedor de datos de incentivos
const incentiveDataProviderContract = new UiIncentiveDataProvider({
  uiIncentiveDataProviderAddress,
  provider,
});

//Reservas de la pool
const reserves = await PoolDataProviderContract.getReservesHumanized({
  lendingPoolAddressProvider,
});

//Parametros del ususario
let parameter = {
  lendingPoolAddressProvider,
  user,
};

//Reservas del usuario
const userReserves = await PoolDataProviderContract.getUserReservesHumanized(
  parameter
);

const reservesArray = reserves.reservesData;
const baseCurrencyData = reserves.baseCurrencyData;

const currentTimestamp = dayjs().unix();

const formatedReserves = formatReserves({
  reserves: reservesArray,
  currentTimestamp,
  marketReferenceCurrencyDecimals:
    baseCurrencyData.marketReferenceCurrencyDecimals,
  marketReferencePriceInUsd: baseCurrencyData.marketReferenceCurrencyPriceInUsd,
});

//Activos de la billetera digital asociada
const userReservesArray = userReserves.userReserves;
const userSummary = formatUserSummary({
  currentTimestamp,
  marketReferencePriceInUsd: baseCurrencyData.marketReferenceCurrencyPriceInUsd,
  marketRederenceCurrencyDecimals:
    baseCurrencyData.marketReferenceCurrencyDecimals,
  userReserves: userReservesArray,
  formatedReserves,
  userEmodeCategoryIdL: userReserves.userEmodeCategoryId,
});

console.log("userSummary", userSummary);

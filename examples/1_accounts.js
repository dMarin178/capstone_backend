import ethers from "ethers";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

//Provedor de Ethereum
const provider = new ethers.providers.JsonRpcProvider(
  `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`
);

//Informacion de la wallet
const userAddress = process.env.USER_ADDRESS;

const main = async () => {
  //Funcion de ether.js para consultar balance de cuenta
  const balance = await provider.getBalance(userAddress);
  console.log(
    `\n El Balance de  ${userAddress} --> ${ethers.utils.formatEther(
      balance
    )} ETH\n`
  );
};

main();

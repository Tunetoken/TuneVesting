require('dotenv').config();

const HDWalletProvider = require("truffle-hdwallet-provider");
const Web3 = require("web3");
const BigNumber = require("bignumber.js");
BigNumber.config({ EXPONENTIAL_AT: 1e9 });
const { tokenVesting } = require("./compile");

const provider = new HDWalletProvider(
  process.env.MNEMONIC, process.env.CONNECTION
);
const web3 = new Web3(provider);

const {
  VESTED_TOKENS,
  CLIFF_DURATIONS,
  TOTAL_VEST_DURATIONS,
  BENEFICIARY_ADDRESSES,
  TOKEN_ADDRESS,
  REVOKABLE
} = require("./config");

const tokens = tokens => new BigNumber(tokens).multipliedBy(1e18).toString();

const deploy = (from, address, tokenAmount, cliffDuration, totalVestDuration) => {
  return new Promise((resolve, reject) => {
    const STARTING_TIME = Math.floor(Date.now() / 1000);

    console.log("Vesting contract for:", address);
    console.log("         token count:", tokenAmount);
    console.log("      cliff duration:", cliffDuration);
    console.log(" total vest duration:", totalVestDuration);

    return new web3.eth.Contract(JSON.parse(tokenVesting.interface))
      .deploy({
        data: '0x' + tokenVesting.bytecode,
        arguments: [
          address, TOKEN_ADDRESS, STARTING_TIME, cliffDuration,
          totalVestDuration, REVOKABLE, tokens(tokenAmount)
        ]
      })
      .send({ from })
      .on('error', error => reject(error))
      .on('transactionHash', txHash => console.log("  mining transaction:", txHash))
      .on('confirmation', (confirmationNumber, receipt) => {
        if (confirmationNumber === 2) {
          console.log("         deployed at:", receipt.contractAddress, "\n");
          resolve();
        }
      });
  });
};

const deployAll = () => {
  return web3.eth.getAccounts().then(async accounts => {
    for (let i = 0; i < BENEFICIARY_ADDRESSES.length; i++) {
      await deploy(accounts[0], BENEFICIARY_ADDRESSES[i], VESTED_TOKENS[i], CLIFF_DURATIONS[i], TOTAL_VEST_DURATIONS[i]);
    }
  }).then(() => {
    console.log("All done 🎉");
    process.exit();
  }).catch(err => {
    console.error(err);
    process.exit();
  });
}

deployAll();

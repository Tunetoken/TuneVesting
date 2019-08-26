require('dotenv').config();

const HDWalletProvider = require("truffle-hdwallet-provider");
const Web3 = require("web3");
const BigNumber = require("bignumber.js");
BigNumber.config({ EXPONENTIAL_AT: 1e9 });
const compile = require("./compile");

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

const deploy = (tokenVesting, from, address, tokenAmount, cliffDuration, totalVestDuration) => {
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

const deployAll = bytecodes => {
  return web3.eth.getAccounts().then(async accounts => {
    for (let i = 0; i < BENEFICIARY_ADDRESSES.length; i++) {
      await deploy(bytecodes.tokenVesting, accounts[0], BENEFICIARY_ADDRESSES[i], VESTED_TOKENS[i], CLIFF_DURATIONS[i], TOTAL_VEST_DURATIONS[i]);
    }
  });
}

const confirm = s => {
  console.log(`\nConnected to ${process.env.CONNECTION}`);
  console.log(`Kill within ${s} seconds if you'd like\n`)
  return new Promise(resolve => setTimeout(resolve, s * 1000));
}

confirm(5) // 5 seconds
  .then(() => {
    console.log("Compiling contracts...");
    return compile();
  })
  .then(bytecodes => {
    console.log("Compiling done!\n")
    return deployAll(bytecodes)
  })
  .then(() => {
    console.log("All done 🎉");
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit()
  });

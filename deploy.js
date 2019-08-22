require('dotenv').config()

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
  CLIFF_DURATION,
  TOTAL_VEST_DURATION,
  BENEFICIARY_ADDRESSES,
  TOKEN_ADDRESS,
  REVOKABLE
} = require("./config");

const tokens = tokens => new BigNumber(tokens).multipliedBy(1e18).toString();

const deploy = async (from, address, tokenAmount) => {
  const STARTING_TIME = Math.floor(Date.now() / 1000);

  const result = await new web3.eth.Contract(
    JSON.parse(tokenVesting.interface)
  ).deploy({
    data: '0x' + tokenVesting.bytecode,
    arguments: [
      address, // bene
      TOKEN_ADDRESS, // token
      STARTING_TIME, // start
      CLIFF_DURATION, //cliff
      TOTAL_VEST_DURATION, // vestDuration
      REVOKABLE, //revoke
      tokens(tokenAmount) // totalTokens
    ]
  });
  
  console.log("Vesting contract for:", address);
  const deployResult = await result.send({ from });
  console.log("      is deployed at:", deployResult.options.address, '\n');
};

const deployAll = async () => {
  const account = (await web3.eth.getAccounts())[0];
  console.log('\n');
  for (let i = 0; i < BENEFICIARY_ADDRESSES.length; i++) {
    await deploy(account, BENEFICIARY_ADDRESSES[i], VESTED_TOKENS[i]);
  }
  console.log("all done 🎉");
}

deployAll();

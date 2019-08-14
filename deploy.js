const HDWalletProvider = require("truffle-hdwallet-provider");
const Web3 = require("web3");
const BigNumber = require("bignumber.js");
BigNumber.config({ EXPONENTIAL_AT: 1e9 });
const { tokenVesting } = require("./compile");

const provider = new HDWalletProvider(
  process.env.MNEMONIC,
  "https://mainnet.infura.io/v3/6255c78ac3454bbbaa3561f9f06adb33"
);
const web3 = new Web3(provider);

const {
  SECONDS_PER_MONTH,
  VESTED_TOKENS,
  CLIFF_DURATION,
  TOTAL_VEST_DURATION
} = require("./config");

const tokens = tokens => new BigNumber(tokens).multipliedBy(1e18).toString();

const deploy = async () => {
  const web3Gas = await web3.utils.toWei("20", "gwei");
  const accounts = await web3.eth.getAccounts();
  let BENEFICIARYADDRESS = "0x800b8791d0b322605b1e039d00f255e428e8b22e";
  let TOKENADDRESS = "0x6b4e0684806Fe53902469B6286024dB9c6271F53";
  let STARTINGTIME = Math.floor(Date.now() / 1000);
  let SET_REVOKABLE = true;
  let result = await new web3.eth.Contract(
    JSON.parse(tokenVesting.interface)
  ).deploy({
    data: tokenVesting.bytecode,
    arguments: [
      BENEFICIARYADDRESS, // bene
      TOKENADDRESS, // token
      STARTINGTIME, // start
      CLIFF_DURATION, //cliff
      TOTAL_VEST_DURATION, // vestDuration
      SET_REVOKABLE, //revoke
      tokens(VESTED_TOKENS) // tokensPerMonth
    ]
  });
  console.log("Contract belongs to: ", BENEFICIARYADDRESS);
  result = await result.send({
    gasPrice: web3Gas,
    gas: 2000000,
    from: accounts[0]
  });
  console.log("Contract deployed to: ", result.options);
};
deploy();

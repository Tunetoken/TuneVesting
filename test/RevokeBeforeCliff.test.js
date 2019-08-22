const assert = require("assert");
const ganache = require("ganache-cli");
const BigNumber = require("bignumber.js");
BigNumber.config({ EXPONENTIAL_AT: 1e9 });
const Web3 = require("web3");
const web3 = new Web3(ganache.provider());

const { tokenVesting, erc20 } = require("../compile");

const {
  SECONDS_PER_MONTH,
  VESTED_TOKENS,
  CLIFF_DURATION,
  TOTAL_VEST_DURATION
} = require("../config");

let vesting;
let token;
let accounts;

const callRPC = (method, params = [], callback) =>
  web3.currentProvider.sendAsync(
    { id: new Date().getTime(), jasonrpc: "2.0", method, params },
    callback
  );

const tokens = tokens => new BigNumber(tokens).multipliedBy(1e18).toString();

const calculateGas = async method => {
  const gas = await vesting.methods[method]().estimateGas();
  console.log(`Gas used: ${gas} for ${method}`);
  return gas;
};

const timeTravel = async seconds => {
  console.log(
    `Traveling ${seconds /
      SECONDS_PER_MONTH} months into the future. ${new Date()}`
  );
  await callRPC("evm_increaseTime", [seconds], () => {});
  await callRPC("evm_mine", [], () => {});
};

const testBlocking = () => {
  it("blocks fetching tokens", async () => {
    try {
      const block = await web3.eth.getBlock("latest");
      await vesting.methods.release(token.options.address).send({
        from: accounts[0]
      });
      assert.fail();
    } catch (err) {
      assert.ok(/tokens/.test(err.message));
    }
  });
};

const outputBlockNumber = async () => {
  const block = await web3.eth.getBlock("latest");
  console.log(`Block timestamp: ${new Date(block.timestamp)}`);
};

before(async () => {
  accounts = await web3.eth.getAccounts();

  token = await new web3.eth.Contract(JSON.parse(erc20.interface))
    .deploy({
      data: erc20.bytecode,
      arguments: [accounts[0], tokens(VESTED_TOKENS[0])]
    })
    .send({
      from: accounts[2],
      gas: "1000000"
    });

  const block = await web3.eth.getBlock("latest");

  vesting = await new web3.eth.Contract(
    JSON.parse(tokenVesting.interface)
  ).deploy({
    data: tokenVesting.bytecode,
    arguments: [
      accounts[1], // bene
      token.options.address, // token
      block.timestamp, // start
      CLIFF_DURATION, //cliff
      TOTAL_VEST_DURATION, // vestDuration
      true, //revoke
      tokens(VESTED_TOKENS[0]) // tokensPerMonth
    ]
  });
  const gas = await vesting.estimateGas();
  console.log(`Gas to deploy: ${gas}`);
  vesting = await vesting.send({
    from: accounts[0],
    gas
  });
  outputBlockNumber();
});

describe("Revoking Tokens from Contract", () => {
  it("deploys a contract", () => {
    assert.ok(vesting.options.address);
  });

  it("tokens are transferred to vesting contract", async () => {
    await token.methods
      .transfer(vesting.options.address, tokens(VESTED_TOKENS[0]))
      .send({
        from: accounts[0]
      });
  });

  it("vesting contract has tokens", async () => {
    const balance = await token.methods
      .balanceOf(vesting.options.address)
      .call({
        from: accounts[0]
      });
    assert.equal(balance, tokens(VESTED_TOKENS[0]));
  });

  it("blocks fetching tokens before cliff", async () => {
    await outputBlockNumber();
    try {
      await vesting.methods.release().send({
        from: accounts[0],
        gas: await calculateGas("release")
      });
      assert.fail();
    } catch (err) {
      assert.ok(/Cliff/.test(err.message));
    }
  });

  it(`sets into the future `, async () => {
    await timeTravel(3000000);
  });

  it("allows revoking tokens before cliff", async () => {
    await outputBlockNumber();
    const release = await vesting.methods.revoke().send({
      from: accounts[0],
      gas: await calculateGas("revoke")
    });
    const balance = await token.methods.balanceOf(accounts[0]).call({
      from: accounts[1]
    });
    assert.equal(balance, tokens(VESTED_TOKENS[0]));
  });

  it("properly blocks releasing when empty", async () => {
    await testBlocking();
  });
});

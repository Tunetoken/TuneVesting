const assert = require("assert");
const ganache = require("ganache-cli");
const BigNumber = require("bignumber.js");
BigNumber.config({ EXPONENTIAL_AT: 1e9 });
const Web3 = require("web3");
const web3 = new Web3(ganache.provider());

const { tokenVesting, erc20 } = require("../compile");

const {
  SECONDS_PER_MONTH,
  MONTHS_TO_RELEASE,
  VESTED_TOKENS,
  TOKENS_PER_MONTH,
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
  console.log(`Gas used: ${gas}`);
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

const outputBlockNumber = async () => {
  const block = await web3.eth.getBlock("latest");
  console.log(`Block timestamp: ${new Date(block.timestamp * 1000)}`);
};

before(async () => {
  accounts = await web3.eth.getAccounts();

  token = await new web3.eth.Contract(JSON.parse(erc20.interface))
    .deploy({
      data: erc20.bytecode,
      arguments: [accounts[0], tokens(VESTED_TOKENS)]
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
      false, //revoke
      tokens(VESTED_TOKENS) // totalTokens
    ]
  });
  const gas = await vesting.estimateGas();
  console.log(`Gas to deploy: ${gas}`);
  vesting = await vesting.send({
    from: accounts[0],
    gas
  });
});

describe("Vesting Contract", () => {
  it("deploys a contract", () => {
    assert.ok(vesting.options.address);
  });

  it("tokens are transferred to vesting contract", async () => {
    await token.methods
      .transfer(vesting.options.address, tokens(VESTED_TOKENS))
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
    assert.equal(balance, tokens(VESTED_TOKENS));
  });

  it(`vesting contract has ${MONTHS_TO_RELEASE} months for the duration`, async () => {
    const months = await vesting.methods.monthsToVest().call({
      from: accounts[0]
    });
    assert.equal(months, MONTHS_TO_RELEASE);
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

  it(`goes into the future by the cliff`, async () => {
    await timeTravel(CLIFF_DURATION);
  });

  it(`goes into the future by a month`, async () => {
    await timeTravel(SECONDS_PER_MONTH);
  });

  it(`allows fetching tokens at 1 month`, async () => {
    await vesting.methods.release().send({
      from: accounts[0],
      gas: await calculateGas("release")
    });
    await outputBlockNumber();
  });

  it(`beneficiary has balance of ${TOKENS_PER_MONTH}`, async () => {
    const balance = await token.methods.balanceOf(accounts[1]).call({
      from: accounts[0]
    });
    assert.equal(balance, tokens(TOKENS_PER_MONTH));
  });

  it("blocks fetching tokens", async () => {
    try {
      const block = await web3.eth.getBlock("latest");
      await vesting.methods.release().send({
        from: accounts[0]
      });
      assert.fail();
    } catch (err) {
      assert.ok(/tokens/.test(err.message));
    }
  });

  it("blocks fetching tokens", async () => {
    // await outputBlockNumber();
    try {
      await vesting.methods.release().send({
        from: accounts[0],
        gas: await calculateGas("release")
      });
      assert.fail();
    } catch (err) {
      assert.ok(/tokens/.test(err.message));
    }
  });

  it("blocks revoking tokens", async () => {
    // await outputBlockNumber();
    try {
      await vesting.methods.revoke().send({
        from: accounts[0],
        gas: await calculateGas("revoke")
      });
      assert.fail();
    } catch (err) {
      assert.ok(/cannot/.test(err.message));
    }
  });

  it("beneficieary has all tokens", async () => {
    const balance = await token.methods.balanceOf(accounts[1]).call({
      from: accounts[0]
    });
    assert.equal(balance, tokens(VESTED_TOKENS));
  });

  it("blocks fetching tokens", async () => {
    try {
      const block = await web3.eth.getBlock("latest");
      await vesting.methods.release().send({
        from: accounts[0]
      });
      assert.fail();
    } catch (err) {
      assert.ok(/tokens/.test(err.message));
    }
  });
});

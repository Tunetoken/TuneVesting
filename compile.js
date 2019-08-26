const path = require('path');
const fs = require('fs');
const solc = require('solc');

const ierc20Source = fs.readFileSync(path.resolve(__dirname, 'contracts', 'IERC20.sol'), 'utf8');
const safeMathSource = fs.readFileSync(path.resolve(__dirname, 'contracts', 'SafeMath.sol'), 'utf8');
const safeMath64Source = fs.readFileSync(path.resolve(__dirname, 'contracts', 'SafeMath64.sol'), 'utf8');
const ownableSource = fs.readFileSync(path.resolve(__dirname, 'contracts', 'Ownable.sol'), 'utf8');
const safeSource = fs.readFileSync(path.resolve(__dirname, 'contracts', 'SafeERC20.sol'), 'utf8');
const erc20Source = fs.readFileSync(path.resolve(__dirname, 'contracts', 'ERC20.sol'), 'utf8');
const vestSource = fs.readFileSync(path.resolve(__dirname, 'contracts', 'TokenVesting.sol'), 'utf8');

const input = {
  'IERC20.sol': ierc20Source,
  'Ownable.sol': ownableSource,
  'SafeMath.sol': safeMathSource,
  'SafeMath64.sol': safeMath64Source,
  'SafeERC20.sol': safeSource,
  'TokenVesting.sol': vestSource,
  'ERC20.sol': erc20Source,
};

console.log("\nCompiling contracts...");
const compiled = solc.compile({ sources: input });
const tokenVesting = compiled.contracts['TokenVesting.sol:TokenVesting'];
const erc20 = compiled.contracts['ERC20.sol:ERC20'];
if (compiled.errors) console.error(compiled.errors);
console.log("Compiling done!\n")

module.exports = {
  tokenVesting: {
    interface: tokenVesting.interface,
    bytecode: tokenVesting.bytecode,
  },
  erc20: {
    interface: erc20.interface,
    bytecode: erc20.bytecode,
  },
};
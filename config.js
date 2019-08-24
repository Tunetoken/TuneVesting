require('dotenv').config()

const SECONDS_PER_MONTH = 2628000;

const MONTHS_TO_CLIFF = process.env.MONTHS_TO_CLIFF.split(',').map(i => i.trim());
const MONTHS_TO_RELEASE = process.env.MONTHS_TO_RELEASE.split(',').map(i => i.trim());
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS
const VESTED_TOKENS = process.env.VESTED_TOKENS.split(',').map(i => i.trim());
const BENEFICIARY_ADDRESSES = process.env.BENEFICIARY_ADDRESSES.split(',').map(i => i.trim());
const REVOKABLE = process.env.REVOKABLE === 'true';

if (
  BENEFICIARY_ADDRESSES.length != VESTED_TOKENS.length ||
  VESTED_TOKENS.length != MONTHS_TO_CLIFF.length ||
  MONTHS_TO_CLIFF.length != MONTHS_TO_RELEASE.length
) {
  throw new ReferenceError("Lengths of inputs don't match up")
}

for (let i = 0; i < VESTED_TOKENS.length; i++) {
  const amount = VESTED_TOKENS[i];
  const monthsToRelease = MONTHS_TO_RELEASE[i];

  if (amount % monthsToRelease !== 0) {
    throw new ReferenceError(
      `Total vested token amount (${amount}) is not cleanly divisible by the months (${monthsToRelease})`
    );
  }
}

const TOKENS_PER_MONTH = VESTED_TOKENS.map((amount, i) => amount / MONTHS_TO_RELEASE[i]);

const CLIFF_DURATIONS = MONTHS_TO_CLIFF.map(months => months * SECONDS_PER_MONTH);
const RELEASABLE_DURATIONS = MONTHS_TO_RELEASE.map(months => months * SECONDS_PER_MONTH);
const TOTAL_VEST_DURATIONS = RELEASABLE_DURATIONS.map((dur, i) => dur + CLIFF_DURATIONS[i]);

RELEASABLE_DURATIONS.forEach(d => {
  if (d % SECONDS_PER_MONTH !== 0) {
    throw new ReferenceError(`Releasable duration ${d} is not a multiple of months`);
  }
});

module.exports = {
  SECONDS_PER_MONTH,
  MONTHS_TO_RELEASE,
  VESTED_TOKENS,
  TOKENS_PER_MONTH,
  CLIFF_DURATIONS,
  TOTAL_VEST_DURATIONS,
  BENEFICIARY_ADDRESSES,
  TOKEN_ADDRESS,
  REVOKABLE
};

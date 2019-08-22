require('dotenv').config()

const SECONDS_PER_MONTH = 2628000;

const MONTHS_TO_CLIFF = process.env.MONTHS_TO_CLIFF;
const MONTHS_TO_RELEASE = process.env.MONTHS_TO_RELEASE;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS
const VESTED_TOKENS = process.env.VESTED_TOKENS.split(',');
const BENEFICIARY_ADDRESSES = process.env.BENEFICIARY_ADDRESSES.split(',');
const REVOKABLE = process.env.REVOKABLE === 'true';

if (BENEFICIARY_ADDRESSES.length != VESTED_TOKENS.length) {
  throw new ReferenceError(
    `Addresses length (${BENEFICIARY_ADDRESSES.length}) must equal vested tokens length (${VESTED_TOKENS.length})`
  )
}

VESTED_TOKENS.forEach(amount => {
  if (amount % MONTHS_TO_RELEASE !== 0) {
    throw new ReferenceError(
      `Total vested token amount (${amount}) is not cleanly divisible by the months (${MONTHS_TO_RELEASE})`
    );
  }
});

const TOKENS_PER_MONTH = VESTED_TOKENS.map(amount => amount / MONTHS_TO_RELEASE);

const CLIFF_DURATION = SECONDS_PER_MONTH * MONTHS_TO_CLIFF;
const RELEASABLE_DURATION = SECONDS_PER_MONTH * MONTHS_TO_RELEASE;
const TOTAL_VEST_DURATION = RELEASABLE_DURATION + CLIFF_DURATION;

if (RELEASABLE_DURATION % SECONDS_PER_MONTH !== 0) {
  throw new ReferenceError("Releasable duration is not a multiple of months");
}

module.exports = {
  SECONDS_PER_MONTH,
  MONTHS_TO_RELEASE,
  VESTED_TOKENS,
  TOKENS_PER_MONTH,
  CLIFF_DURATION,
  TOTAL_VEST_DURATION,
  BENEFICIARY_ADDRESSES,
  TOKEN_ADDRESS,
  REVOKABLE
};

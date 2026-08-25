// Only en_US is authored here. The other locales are left as the English text
// rather than machine-translated, so a translator can see what still needs doing
// instead of finding plausible-looking text that nobody checked.
const shortEn =
  'EXPERIMENTAL: Bitcoin Knots with BLAKE2b proof of work, for test networks'

const longEn =
  'An experimental build of Bitcoin Knots carrying the proposed BLAKE2b ' +
  'proof-of-work change, packaged so you can mine it with an existing ' +
  'Sia-compatible BLAKE2b ASIC. ' +
  'It runs either a private chain of your own, where you choose the activation ' +
  'height and mine every block yourself, or the public BLAKE2b test network ' +
  '(testnet4), where activation is fixed at height 149537. On the public ' +
  'network you must add peers by hand: its DNS seeds return ordinary testnet4 ' +
  'nodes that are not on the fork. Coins on either chain are worthless by ' +
  'construction. Mainnet is not offered, and this build refuses it outright. ' +
  'It installs alongside the official Bitcoin Knots package without touching it. ' +
  'The consensus rules it implements are an open pull request that is still ' +
  'changing, so treat every upgrade as potentially chain-breaking.'

export const short = {
  en_US: shortEn,
  es_ES: shortEn,
  de_DE: shortEn,
  pl_PL: shortEn,
  fr_FR: shortEn,
}

export const long = {
  en_US: longEn,
  es_ES: longEn,
  de_DE: longEn,
  pl_PL: longEn,
  fr_FR: longEn,
}

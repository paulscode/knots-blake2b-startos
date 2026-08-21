// Only en_US is authored here. The other locales are left as the English text
// rather than machine-translated, so a translator can see what still needs doing
// instead of finding plausible-looking text that nobody checked.
const shortEn = 'EXPERIMENTAL: Bitcoin Knots with BLAKE2b proof of work, regtest only'

const longEn =
  'An experimental build of Bitcoin Knots carrying the proposed BLAKE2b ' +
  'proof-of-work change, packaged so you can mine it with an existing ' +
  'Sia-compatible BLAKE2b ASIC. ' +
  'This runs on regtest only: no public chain has the BLAKE2b activation height ' +
  'set, so there is nothing else to connect to and the coins are worthless by ' +
  'construction. ' +
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

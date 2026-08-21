export const DEFAULT_LANG = 'en_US'

const dict = {
  'Starting Bitcoin Knots BLAKE2b (regtest)': 0,
  'RPC': 1,
  'Bitcoin JSON-RPC. Used by the BLAKE2b gateway.': 2,
  'Peer': 3,
  'P2P for connecting to another BLAKE2b regtest node.': 4,
  'The node is accepting RPC': 5,
  'The node is not accepting RPC yet': 6,
  'Get Payout Address': 7,
  'Create an address in this node’s wallet, to paste into the gateway as its payout address.': 8,
  'Payout Address': 9,
  'Copy this into the gateway’s Set Payout Address action. Blocks mined will pay here.': 10,
  'Address': 11,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict

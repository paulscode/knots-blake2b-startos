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
  'Show Wallet Balance': 12,
  'See what this node has mined. These coins exist only on your own private test chain.': 13,
  'Wallet Balance': 14,
  'These coins are only on the private test chain running on this server. They cannot be sent to anyone else, and they are not worth anything. Nothing outside this machine knows they exist.': 15,
  'Mined so far': 16,
  'Spendable now': 17,
  'Not spendable yet': 18,
  'Freshly mined coins need 100 more blocks before they can be spent. This is normal, and it is where a new miner’s rewards sit.': 19,
  'Blocks on this chain': 20,
  'Your chain started empty, so this is how many blocks have been mined here.': 21,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict

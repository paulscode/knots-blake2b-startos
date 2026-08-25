export const DEFAULT_LANG = 'en_US'

const dict = {
  'Starting Bitcoin Knots BLAKE2b': 0,
  'RPC': 1,
  'Bitcoin JSON-RPC. Used by the BLAKE2b gateway.': 2,
  'Peer': 3,
  'P2P for connecting to other BLAKE2b nodes.': 4,
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
  'Chain': 22,
  'Waiting for the node to answer RPC': 23,
  'This node reports no BLAKE2b activation for this chain. It is not running the fork.': 24,
  'This build activates BLAKE2b at a different height than expected on testnet4': 25,
  'Following the BLAKE2b chain': 26,
  'Syncing': 27,
  'Stalled just below the BLAKE2b activation height. This node has no peers on the fork: testnet4’s DNS seeds return ordinary testnet4 nodes, which cannot serve the blocks after it. Add fork peers with the Set Peers action.': 28,
  'Before the BLAKE2b activation': 29,
  'Select Chain': 30,
  'Choose whether this node runs its own private chain or joins the public BLAKE2b test network.': 31,
  'The node restarts and begins following the chain you pick. Nothing is deleted: each chain keeps its own data, so switching back returns you to where you left off. On the public test network you must also add peers, because its DNS seeds return nodes that are not on the fork.': 32,
  'A private chain is yours alone: you pick the activation height and mine every block yourself. The public test network is shared with other testers, and BLAKE2b activates there at height 149537, which is fixed in the software rather than configurable.': 33,
  'Private chain (regtest)': 34,
  'Public BLAKE2b test network (testnet4)': 35,
  'Set Peers': 36,
  'Add nodes to connect to. Required on the public BLAKE2b test network, whose DNS seeds return nodes that are not on the fork.': 37,
  'The node restarts to apply the change. A peer that is not on the BLAKE2b chain will not break anything, it simply cannot serve blocks after the activation height.': 38,
  'Peers': 39,
  'One address per line, as host:port. These are dialled in addition to whatever the network’s own seeds provide.': 40,
  'Stuck at the block before BLAKE2b activation. This node has the fork’s headers but is refusing its blocks, which almost always means the headline does not match. Check the logs for bad-headline.': 41,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict

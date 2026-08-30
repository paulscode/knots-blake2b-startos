import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

export const inputSpec = InputSpec.of({
  peers: Value.textarea({
    name: i18n('Peers'),
    description: i18n(
      'One address per line, as host:port. These are dialled in addition to the peers built into this service.',
    ),
    required: false,
    default: null,
    placeholder: 'example.org:48333',
  }),
})

/**
 * Peers to dial, on top of whatever the chain's seeds provide.
 *
 * Rarely needed now, and worth saying why it still exists.
 *
 * On mainnet the node finds the fork by itself: bitcoind queries every DNS seed
 * as `x<SeedsServiceFlags()>.<seed>`, which on this build is x10000009, being
 * NODE_NETWORK | NODE_WITNESS | NODE_BLAKE2B, and two of mainnet's seeds answer
 * that prefix with fork nodes. So this is a fallback for when those seeds are
 * down or filtering badly, not a requirement.
 *
 * It was a requirement on the BLAKE2b testnet4, whose DNS seeds returned
 * ordinary testnet4 nodes: without at least one peer actually on the fork, a
 * node synced to one block below activation and stopped there looking perfectly
 * healthy. That chain is not offered by this build, but the failure mode is the
 * same wherever seeds cannot distinguish the chains, which is why the Chain
 * health check tells "stalled below activation" apart from "no peers".
 *
 * No validation beyond trimming: bitcoind's `addnode` accepts hostnames, IPv4,
 * bracketed IPv6 and onion addresses, with or without a port, and rejecting
 * something it would have accepted is worse than passing a bad entry through to
 * a log line.
 */
export const setPeers = sdk.Action.withInput(
  'set-peers',

  async () => ({
    name: i18n('Set Peers'),
    description: i18n(
      'Add nodes to connect to, on top of the ones this service already knows. Only needed if the built-in peers stop working.',
    ),
    warning: i18n(
      'The node restarts to apply the change. A peer that is not on the BLAKE2b chain will not break anything, it simply cannot serve blocks after the activation height.',
    ),
    allowedStatuses: 'any',
    group: i18n('Configuration'),
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => ({
    peers: ((await storeJson.read((s) => s.addnodes).once()) ?? []).join('\n'),
  }),

  async ({ effects, input }) => {
    const addnodes = (input.peers ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    await storeJson.merge(effects, { addnodes })
  },
)

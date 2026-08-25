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
 * This exists because of a specific property of the BLAKE2b testnet4: the fork
 * shares testnet4's magic bytes, default port and genesis block, so its DNS
 * seeds (`seed.testnet4.bitcoin.sprovoost.nl`, `seed.testnet4.wiz.biz`) hand
 * back ordinary testnet4 nodes that are not on the fork. Those peers are useful
 * up to height 149537, since both chains share that history, and useless after
 * it. Without at least one peer that is actually on the fork, the node syncs to
 * 149536 and stops there looking perfectly healthy, which is what the Chain
 * health check is for.
 *
 * A free-text list rather than a curated default, because a hardcoded peer list
 * is both a maintenance burden and a centralisation point. When there are
 * addresses stable enough to commit to, they belong in `testnet4Seeds` in
 * utils.ts and are merged with whatever is set here.
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
    group: null,
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

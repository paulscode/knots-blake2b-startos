import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  chainFlag,
  dataDir,
  defaultActivationHeight,
  defaultChain,
  defaultHeadline,
  rpcPort,
  testnet4ActivationHeight,
  testnet4Seeds,
  type Chain,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Bitcoin Knots BLAKE2b'))

  // Tolerate an absent store rather than refusing to start: every field has a
  // default, so there is nothing here that a missing file makes unsafe.
  const store = await storeJson.read().const(effects)
  const chain: Chain = store?.chain ?? defaultChain

  // On testnet4 the DNS seeds return ordinary testnet4 nodes, which is not
  // useful for finding the fork, so whatever the operator supplies is added to
  // the curated list. On regtest there is nothing to discover at all and the
  // list is normally empty.
  const addnodes = [
    ...(chain === 'testnet4' ? testnet4Seeds : []),
    ...(store?.addnodes ?? []),
  ]

  const env = {
    CHAIN: chain,
    BLAKE2B_HEADLINE: store?.blake2bHeadline ?? defaultHeadline,
    // Written into the conf only on regtest; see entrypoint.sh. Passing it
    // regardless keeps this side simple and the decision in one place.
    BLAKE2B_ACTIVATION_HEIGHT: String(
      store?.activationHeight ?? defaultActivationHeight,
    ),
    PRUNE: String(store?.prune ?? 1),
    FASTPRUNE: (store?.fastprune ?? true) ? '1' : '0',
    ADDNODES: addnodes.join(' '),
    // No RPC_USER/RPC_PASSWORD: bitcoind writes a .cookie into the datadir and
    // the gateway reads it through a read-only mount of this volume. Nothing
    // here has to generate or store an RPC secret.
    //
    // The bridge is the only route to this port; it is never published to the
    // LAN. `rpcallowip` is wide because the bridge address is not knowable here.
    RPC_ALLOW_IP: '0.0.0.0/0',
  }

  const subcontainer = sdk.SubContainer.of(
    effects,
    { imageId: 'knots' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: dataDir,
      readonly: false,
    }),
    'knots-node',
  )

  const cli = ['bitcoin-cli', `-datadir=${dataDir}`, chainFlag(chain)]

  return (
    sdk.Daemons.of(effects)
      // StartOS mounts volumes root-owned on every start and the image runs as
      // the unprivileged `bitcoin` user, so without this the node cannot write
      // its own bitcoin.conf. Found the hard way: the package built, packed and
      // installed clean, then crash-looped on `/data/bitcoin.conf: Permission
      // denied`. A oneshot rather than a migration because it is a fact about
      // the volume re-asked every start, not about our version.
      .addOneshot('chown', {
        subcontainer,
        exec: {
          command: ['chown', '-R', 'bitcoin:bitcoin', dataDir],
          user: 'root',
        },
        requires: [],
      })
      .addDaemon('node', {
        subcontainer,
        exec: { command: ['/usr/local/bin/entrypoint.sh'], env },
        ready: {
          display: i18n('RPC'),
          fn: () =>
            sdk.healthCheck.checkPortListening(effects, rpcPort, {
              successMessage: i18n('The node is accepting RPC'),
              errorMessage: i18n('The node is not accepting RPC yet'),
            }),
        },
        requires: ['chown'],
      })
      /**
       * Which chain is this node actually on?
       *
       * The question the UI could not otherwise answer, and the reason this
       * check exists rather than a plain sync-progress bar. On testnet4 the
       * BLAKE2b fork shares the magic bytes, default port and genesis block of
       * ordinary testnet4, so a fork node and a Core node connect to each other
       * happily and exchange headers. They disagree only from height 149537,
       * where this node rejects the other chain's 80-byte SHA256d headers.
       *
       * So the failure is not silently following the wrong chain: it is sitting
       * one block below the fork, fully connected, looking synced, forever.
       * `getdeploymentinfo` reports a `hardfork` object carrying the activation
       * height and whether the tip has crossed it, on both regtest and testnet4,
       * which is exactly enough to say which of those two situations this is.
       */
      .addHealthCheck('chain', {
        requires: ['node'],
        ready: {
          display: i18n('Chain'),
          fn: async () => {
            const read = async (args: string[]) => {
              const r = await subcontainer.exec([...cli, ...args])
              if (r.exitCode !== 0) return null
              try {
                return JSON.parse(r.stdout.toString())
              } catch {
                return null
              }
            }

            const info = await read(['getblockchaininfo'])
            if (!info) {
              return {
                result: 'starting' as const,
                message: i18n('Waiting for the node to answer RPC'),
              }
            }

            const deployments = await read(['getdeploymentinfo'])
            const hardfork = deployments?.hardfork
            if (!hardfork) {
              // Would mean a build with no BLAKE2b schedule on this chain, which
              // this image should not be able to produce. Say so rather than
              // reporting healthy.
              return {
                result: 'failure' as const,
                message: i18n(
                  'This node reports no BLAKE2b activation for this chain. It is not running the fork.',
                ),
              }
            }

            const blocks: number = info.blocks ?? 0
            const headers: number = info.headers ?? 0
            const activation: number = hardfork.height

            // A repin to a different tag could move this. It is consensus, so
            // it should be loud rather than inferred from a stall later.
            if (chain === 'testnet4' && activation !== testnet4ActivationHeight) {
              return {
                result: 'failure' as const,
                message: `${i18n('This build activates BLAKE2b at a different height than expected on testnet4')}: ${activation} != ${testnet4ActivationHeight}`,
              }
            }

            // Height, not `hardfork.active`. Measured: `active` flips to true
            // one block *before* the activation height, because it reports
            // whether the next block is subject to the rule. A testnet4 node
            // stalled at 149536 therefore has `active: true`, and keying success
            // off it would report "following the BLAKE2b chain" for exactly the
            // situation this check exists to catch.
            if (blocks >= activation) {
              return {
                result: 'success' as const,
                message: `${i18n('Following the BLAKE2b chain')} (${blocks})`,
              }
            }

            // Not yet across the fork. Two very different reasons, and the whole
            // point is to tell them apart.
            if (headers > blocks) {
              return {
                result: 'loading' as const,
                message: `${i18n('Syncing')} ${blocks}/${headers}`,
              }
            }

            // Caught up with every peer, and still one block short of the fork.
            // On testnet4 that is the signature of having only non-fork peers.
            if (blocks === activation - 1 && chain === 'testnet4') {
              return {
                result: 'failure' as const,
                message: i18n(
                  'Stalled just below the BLAKE2b activation height. This node has no peers on the fork: testnet4’s DNS seeds return ordinary testnet4 nodes, which cannot serve the blocks after it. Add fork peers with the Set Peers action.',
                ),
              }
            }

            return {
              result: 'loading' as const,
              message: `${i18n('Before the BLAKE2b activation')} ${blocks}/${activation}`,
            }
          },
        },
      })
  )
})

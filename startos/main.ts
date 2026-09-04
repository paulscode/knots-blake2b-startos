import { writeFile } from 'fs/promises'

import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  chainFlag,
  dataDir,
  rpcAllowIpPruned,
  rpcBindPruned,
  rpcPort,
  rpcPortPruned,
  defaultPruneMib,
  mainnetActivationHeight,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Bitcoin Knots (BLAKE2b) Companion'))

  // Tolerate an absent store rather than refusing to start: every field has a
  // default, so there is nothing here that a missing file makes unsafe.
  const store = await storeJson.read().const(effects)

  // No curated list, and that is deliberate. bitcoind queries every DNS seed as
  // `x<SeedsServiceFlags()>`, which on this build is x10000009, being
  // NODE_NETWORK | NODE_WITNESS | NODE_BLAKE2B, and two of mainnet's seeds
  // answer that prefix with fork nodes. So this is whatever the operator
  // supplied, and normally empty.
  const addnodes = [...(store?.addnodes ?? [])]

  const pruning = (store?.prune ?? defaultPruneMib) !== 0

  const env = {
    PRUNE: String(store?.prune ?? defaultPruneMib),
    // Pruning puts btc-rpc-proxy on 18443, the port dependents resolve, and
    // moves bitcoind behind it on loopback. Unpruned there is nothing to fetch,
    // so bitcoind keeps 18443 and no proxy runs.
    RPC_PORT: String(pruning ? rpcPortPruned : rpcPort),
    RPC_BIND: pruning ? rpcBindPruned : '0.0.0.0',
    ADDNODES: addnodes.join(' '),
    // No RPC_USER/RPC_PASSWORD: bitcoind writes a .cookie into the datadir and
    // the gateway reads it through a read-only mount of this volume. Nothing
    // here has to generate or store an RPC secret.
    //
    // The bridge is the only route to this port; it is never published to the
    // LAN. `rpcallowip` is wide because the bridge address is not knowable here.
    RPC_ALLOW_IP: pruning ? rpcAllowIpPruned : '0.0.0.0/0',
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

  const cli = ['bitcoin-cli', `-datadir=${dataDir}`, chainFlag]

  // Health-check state, held across polls by the closure below. A node crossing
  // the fork sits at activation-1 for a few seconds legitimately, so the stall
  // is only reported once it has been seen this many times running.
  const STALL_OBSERVATIONS = 3
  let stalledAt: number | null = null
  let stalledFor = 0

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
            sdk.healthCheck.checkPortListening(
              effects,
              pruning ? rpcPortPruned : rpcPort,
              {
                successMessage: i18n('The node is accepting RPC'),
                errorMessage: i18n('The node is not accepting RPC yet'),
              },
            ),
        },
        requires: ['chown'],
      })
      /**
       * Which chain is this node actually on?
       *
       * The question the UI could not otherwise answer, and the reason this
       * check exists rather than a plain sync-progress bar. The two mainnet
       * chains share magic bytes, port 8333 and every block up to 961631, so a
       * BLAKE2b node and an ordinary one connect to each other happily and
       * exchange headers. They disagree only from 961640, where this node
       * rejects the other chain's 80-byte SHA256d headers.
       *
       * So the failure this catches is not silently following the wrong chain:
       * it is sitting one block below the fork, fully connected, looking
       * synced, forever. `getdeploymentinfo` reports a `blake2b` object
       * (`hardfork` before rc3) carrying the activation height and whether the
       * tip has crossed it, which is exactly enough to say which situation this
       * is.
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
            // rc3 renamed this top-level key from `hardfork` to `blake2b`
            // (rpc/blockchain.cpp, `deploymentinfo.pushKV`); its contents are
            // unchanged, `height` and `active`. Read either, so a repin in
            // either direction cannot turn this check into a false failure
            // claiming the node is not running the fork. Verified against a
            // built rc3 binary: the key is `blake2b`.
            const hardfork = deployments?.blake2b ?? deployments?.hardfork
            if (!hardfork) {
              // Would mean a build with no BLAKE2b schedule on mainnet, which
              // this image should not be able to produce. Say so rather than
              // reporting healthy.
              return {
                result: 'failure' as const,
                message: i18n(
                  'This node reports no BLAKE2b activation. It is not running the fork.',
                ),
              }
            }

            const blocks: number = info.blocks ?? 0
            const headers: number = info.headers ?? 0
            const activation: number = hardfork.height

            // A repin to a different tag could move this. It is consensus, so
            // it should be loud rather than inferred from a stall later.
            if (activation !== mainnetActivationHeight) {
              return {
                result: 'failure' as const,
                message: `${i18n('This build activates BLAKE2b at a different height than expected on mainnet')}: ${activation} != ${mainnetActivationHeight}`,
              }
            }

            // Height, not `hardfork.active`. Measured: `active` flips to true
            // one block *before* the activation height, because it reports
            // whether the next block is subject to the rule. A node stalled at
            // 961639 therefore has `active: true`, and keying success off it
            // would report "following the BLAKE2b chain" for exactly the
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

            // One block short of the fork, with no more headers to apply. This
            // is the stall, and it has one cause worth naming: no peers on this
            // side of the split. Both chains share magic bytes and port 8333,
            // so a node can be fully connected to peers that will happily serve
            // it everything up to 961639 and nothing after.
            //
            // The headline used to be the other candidate here, and is not any
            // more: mainnet's is compiled into chainparams as of this pin, so
            // this package cannot get it wrong. That is why the two-way message
            // this check used to print is gone.
            //
            // Only reported after several consecutive observations, because a
            // healthy node passes through this state briefly on its way across
            // the fork.
            if (blocks === activation - 1) {
              stalledFor = stalledAt === blocks ? stalledFor + 1 : 0
              stalledAt = blocks
              if (stalledFor >= STALL_OBSERVATIONS) {
                return {
                  result: 'failure' as const,
                  message: i18n(
                    'Stalled just below the BLAKE2b activation height, which means this node has no peers on the fork. It normally finds them through the DNS seeds. Add one directly with the Set Peers action if your network blocks DNS.',
                  ),
                }
              }
            } else {
              stalledFor = 0
              stalledAt = null
            }

            return {
              result: 'loading' as const,
              message: `${i18n('Before the BLAKE2b activation')} ${blocks}/${activation}`,
            }
          },
        },
      })
      // Serves the blocks this node has dropped, and only then. Returning null
      // when unpruned is how a conditional daemon is expressed; there is nothing
      // to fetch on an archival node and the port belongs to bitcoind.
      //
      // A dependent needs no notion of any of this. It resolves the same host
      // and port either way, and gets a node that answers for the whole chain.
      .addDaemon('proxy', async () => {
        if (!pruning) return null

        const proxySub = await sdk.SubContainer.eager(
          effects,
          { imageId: 'proxy' },
          sdk.Mounts.of().mountVolume({
            volumeId: 'main',
            subpath: null,
            mountpoint: dataDir,
            readonly: true,
          }),
          'proxy-sub',
        )

        // Mainnet keeps its cookie at the root of the data directory. A named
        // chain would put it in a subdirectory, which is what this used to have
        // to work out; there is no named chain any more.
        const cookie = `${dataDir}/.cookie`

        // Written by hand rather than through a TOML library: every value here
        // is a number or a path this file computed, none of it is user input,
        // and adding a dependency to serialize eight known lines is not worth
        // the supply chain.
        await writeFile(
          `${proxySub.rootfs}/config.toml`,
          [
            `bitcoind_address = "127.0.0.1"`,
            `bitcoind_port = ${rpcPortPruned}`,
            `bind_address = "0.0.0.0"`,
            `bind_port = ${rpcPort}`,
            `cookie_file = "${cookie}"`,
            // Dependents authenticate to the proxy with the same cookie
            // bitcoind wrote, so nothing new is generated, stored or shared.
            `passthrough_rpccookie = "${cookie}"`,
            // Users derived from passthrough carry no fetch_blocks of their
            // own, so this global switch is what grants them on-demand fetching
            // of dropped blocks. Without it every getblock goes straight to
            // bitcoind and a pruned block still fails.
            `default_fetch_blocks = true`,
            // Unset, the proxy asks every eligible peer for the same block at
            // once and keeps the first valid answer, which is N copies of every
            // fetch.
            `max_peer_concurrency = 3`,
            // A verbose transaction lookup asks for the same block twice by
            // itself, so the repeat should not go back to the network.
            `block_cache_size_mib = 64`,
            '',
          ].join('\n'),
          { mode: 0o600 },
        )

        return {
          subcontainer: proxySub,
          exec: {
            // The verbosity counter starts at Critical, a level the proxy has
            // no call sites for, so unraised it cannot report a failure at all.
            command: [
              '/usr/bin/btc_rpc_proxy',
              '--conf',
              '/config.toml',
              '-vv',
            ] as [string, ...string[]],
          },
          ready: {
            display: i18n('RPC Proxy'),
            fn: () =>
              sdk.healthCheck.checkPortListening(effects, rpcPort, {
                successMessage: i18n('Serving RPC, and fetching pruned blocks'),
                errorMessage: i18n('The RPC proxy is not ready'),
              }),
          },
          requires: ['node' as const],
        }
      })
  )
})

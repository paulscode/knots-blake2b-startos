import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { readFile, rm } from 'fs/promises'
import { bitcoinConfFile, defaultPruneMib } from '../fileModels/bitcoin.conf'

/**
 * The old store, as a migration sees it: the host path rather than the
 * `sdk.volumes.main` handle. The keys read here are not in the new schema, so
 * the file model cannot express them.
 */
const storePath = '/media/startos/volumes/main/store.json'

/** The bitcoin.conf the pre-1.0.0:31 entrypoint generated on every start. */
const confPath = '/media/startos/volumes/main/bitcoin.conf'

const notes =
  'This service now has the settings the official Bitcoin Knots package has. ' +
  'It had five actions; it has twenty-five. ' +
  ' ' +
  'CONFIGURATION. Peers, RPC, mempool and a long list of policy and network ' +
  'settings are now editable, grouped the way the official package groups them, ' +
  'and written to bitcoin.conf directly rather than generated from a handful of ' +
  'values on every start. ' +
  ' ' +
  'WALLET. Get Address, Get Balance, Send Coins, Send All Coins, Sign Message, ' +
  'Backup Wallet, Restore Wallet, Remove Wallet and Select Wallet. This node ' +
  'can hold and spend coins on the BLAKE2b chain from its own screens now, ' +
  'rather than only telling you a balance. Back the wallet up before you use ' +
  'it: a block you mine pays its whole subsidy to a key only this node holds. ' +
  ' ' +
  'MAINTENANCE. Reindex Blockchain, Reindex Chainstate, Take Snapshot ' +
  '(assumeutxo), Prioritise Transaction, and actions to delete the transaction ' +
  'index, the coinstats index, stored peers and RPC credentials. ' +
  ' ' +
  'TOR AND I2P. Both are supported, as optional. Tor is an optional dependency ' +
  'and I2P runs as a second container when you enable it. ' +
  ' ' +
  'YOUR EXISTING SETTINGS CARRY OVER. Pruning and any peers you added are read ' +
  'out of the old store and written into the new bitcoin.conf. Nothing resyncs. ' +
  ' ' +
  'WHAT STAYS DIFFERENT FROM THE OFFICIAL PACKAGE. This one follows the BLAKE2b ' +
  'chain, it is pruned by default rather than archival, its RPC and peer ports ' +
  'are 18443/18444/18445 so it can run beside the official package, it has a ' +
  'Chain health check that tells "no peers on the fork" apart from an ordinary ' +
  'sync, and its RPC proxy is a build that can parse a BLAKE2b block. The stock ' +
  'proxy cannot, and returns an IO error for every verbose block or transaction ' +
  'lookup above block 961640. ' +
  ' ' +
  'Also fixes an interface export that could take RPC and peer down with it. A ' +
  'read of bitcoin.conf that came back empty used to de-export every interface ' +
  'at once, including the two that do not depend on that file, which every ' +
  'dependent watches. Only the ZMQ and I2P exports need the file now, and an ' +
  'empty read is treated as a gap rather than as data.'

export const current = VersionInfo.of({
  version: '1.0.0:31',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    /**
     * Carry the old package's two settings into the new bitcoin.conf, then
     * discard the conf the old entrypoint used to generate.
     *
     * Up to 1.0.0:30 this package had no config file of its own. `store.json`
     * held `prune` and `addnodes`, `main.ts` passed them to `entrypoint.sh` as
     * environment, and the entrypoint wrote a fresh `bitcoin.conf` on every
     * start. From here bitcoin.conf is the source of truth and the entrypoint is
     * not used on StartOS at all.
     *
     * The old file is deleted rather than parsed. It is valid INI and the new
     * model would read it, but it puts the RPC and p2p binds inside a `[main]`
     * section, which this model neither writes nor understands: they would be
     * read as an unknown nested key, dropped on the next write, and the node
     * would come back on default binds. Deleting it means `seedFiles` writes a
     * correct one, and the only two values worth keeping are taken from the
     * store first.
     *
     * Read raw, because neither key is in the new store schema.
     */
    up: async ({ effects }) => {
      const raw = await readFile(storePath, 'utf8').catch(() => null)

      // Defaulted, not left undefined, and this is the one line in the file that
      // has to be right.
      //
      // `seedFiles` only supplies a prune value on a fresh install; on an update
      // it merges `{}`, so an absent key falls through to the shape's
      // `.catch(0)`, which is archival. A node that has been running pruned would
      // then quietly stop pruning and start filling the disk, with nothing to
      // say so until it was full. `defaultPruneMib` is what the old package
      // defaulted to, so an install that never chose a value gets the value it
      // was already running with.
      let prune: number = defaultPruneMib
      let addnode: string[] | undefined

      if (raw !== null) {
        try {
          const store = JSON.parse(raw) as Record<string, unknown>
          // 0 is meaningful here (archival, chosen deliberately), so this tests
          // the type rather than truthiness.
          if (typeof store.prune === 'number' && Number.isFinite(store.prune)) {
            prune = store.prune
          }
          if (
            Array.isArray(store.addnodes) &&
            store.addnodes.every((v) => typeof v === 'string')
          ) {
            const peers = (store.addnodes as string[]).filter(
              (p) => p.trim().length > 0,
            )
            if (peers.length > 0) addnode = peers
          }
        } catch {
          // An unreadable store is not this migration's to repair; the pruned
          // default above still applies, which is the value the old package used.
        }
      }

      await rm(confPath, { force: true }).catch(console.error)

      await bitcoinConfFile.merge(effects, {
        prune,
        ...(addnode !== undefined ? { addnode } : {}),
      })
    },
    down: IMPOSSIBLE,
  },
})

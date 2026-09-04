import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { readFile, writeFile } from 'fs/promises'

/**
 * The store as a migration sees it, which is the host path rather than the
 * `sdk.volumes.main` handle the file model uses. Sibling packages address the
 * same volume this way from a migration, so the layout is not being guessed at.
 */
const storePath = '/media/startos/volumes/main/store.json'

/** Settings that no longer exist, cleared so the file says what it means. */
const DEAD_KEYS = ['chain', 'blake2bHeadline', 'activationHeight', 'fastprune']

const notes =
  'This node now follows the public BLAKE2b chain on mainnet and nothing else. ' +
  'Select Chain is gone, along with the private test chain it offered. ' +
  ' ' +
  'Those chains existed to prove the fork worked before it had a public chain ' +
  'to run on. It has had one since 30 August 2026, and carrying them was ' +
  'costing more than it was worth: the activation height, the headline the ' +
  'activation block commits to, the RPC cookie’s location, even the section ' +
  'name in bitcoin.conf all had to be worked out per chain, and every one of ' +
  'them is fixed on mainnet. The package is a good deal simpler for dropping ' +
  'them, and it now behaves the way the official Bitcoin Knots package does. ' +
  ' ' +
  'IF YOU WERE RUNNING THE PRIVATE CHAIN, THIS NODE WILL START SYNCING ' +
  'MAINNET. Nothing is deleted. bitcoind keeps a private chain in its own ' +
  'directory, so that data is still on the volume, and it is still in your ' +
  'backups; there is simply no longer a way to select it from the UI. ' +
  'The sync is pruned by default, so it costs about 5 GB rather than the whole ' +
  'chain. Change that under Select Storage. ' +
  ' ' +
  'Show Wallet Balance used to say the coins it reported were worthless and ' +
  'existed only on your own machine. That was true of the private chain and is ' +
  'not true of this one: a balance there is a real balance on the BLAKE2b ' +
  'chain. The wording is corrected, and Get Payout Address now carries the ' +
  'warning it should always have had about backing up the node’s wallet. ' +
  ' ' +
  'The package description was also still describing a test-network build that ' +
  'refused mainnet, which it has not been since the fork activated.'

export const current = VersionInfo.of({
  version: '1.0.0:30',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    /**
     * Drop the settings this version stopped having.
     *
     * Not strictly required: the store is parsed through a zod object, which
     * strips keys the shape does not name, so a leftover `chain` would be
     * ignored on read and dropped on the next write. It is done explicitly
     * anyway, because until something writes, the file on disk still says
     * `"chain": "regtest"` while the node is plainly running mainnet, and the
     * next person to read that file to work out what a node is doing should not
     * be told something false by it.
     *
     * Written raw rather than through the file model for the same reason the
     * :26 migration read it raw: these keys are not in the schema, so the model
     * cannot express them.
     */
    up: async ({ effects }) => {
      const raw = await readFile(storePath, 'utf8').catch(() => null)
      if (raw === null) return

      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        // An unreadable store is not this migration's to repair; the file model
        // rebuilds it from defaults on the next read.
        return
      }
      if (parsed === null || typeof parsed !== 'object') return

      const store = parsed as Record<string, unknown>
      if (!DEAD_KEYS.some((k) => k in store)) return
      for (const k of DEAD_KEYS) delete store[k]

      await writeFile(storePath, JSON.stringify(store, null, 2) + '\n', 'utf8')
    },
    down: IMPOSSIBLE,
  },
})

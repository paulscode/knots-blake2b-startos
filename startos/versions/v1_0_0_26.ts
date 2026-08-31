import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { readFile } from 'fs/promises'
import { storeJson } from '../fileModels/store.json'

/**
 * The store as the migration sees it, which is the host path rather than the
 * `sdk.volumes.main` handle the file model uses. Sibling packages address the
 * same volume this way from a migration (`knots-prerdts` clears index files
 * under it), so the layout is not being guessed at here.
 */
const storePath = '/media/startos/volumes/main/store.json'

const notes =
  'A new install now follows the public BLAKE2b chain on mainnet. It used to ' +
  'start on a private chain of its own, which meant the common case, following ' +
  'the chain this package exists for, took an extra step, and the uncommon case ' +
  'was the one you got for free. Select Chain still offers the private chain, ' +
  'and the form now opens on mainnet. ' +
  ' ' +
  'An install that already exists is not moved. If you never picked a chain, ' +
  'this update pins you to the private chain you were actually running rather ' +
  'than letting the new default carry you onto mainnet and start a sync of the ' +
  'whole chain you did not ask for. If you did pick one, including mainnet, ' +
  'nothing changes. Either way no data is deleted: each chain keeps its own, so ' +
  'switching returns you to where you left off. ' +
  ' ' +
  'A new install is still pruned by default, keeping 5 GiB of blocks, so ' +
  'following mainnet costs gigabytes rather than the whole chain. Select ' +
  'Storage changes that. ' +
  ' ' +
  'Select Chain also described mainnet as a test network, which it is not. ' +
  'Wording only; the action behaved correctly.'

export const v1_0_0_26 = VersionInfo.of({
  version: '1.0.0:26',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    // Pin the chain an existing install is already running.
    //
    // `defaultChain` moved from regtest to mainnet in this version. The store
    // only gains a `chain` key when someone runs Select Chain, so an install
    // that never ran it has no key at all and reads whatever the default is.
    // Left alone, such a node would come back from this upgrade pointed at
    // mainnet: a chain it never chose and a ~960k block sync nobody asked for.
    // Its regtest data would still be on disk, which makes it recoverable, not
    // harmless.
    //
    // The key has to be read raw. `storeJson.read()` returns the zod-parsed
    // object, and `chain` carries `.catch(defaultChain)`, so a missing key comes
    // back already filled in with the new default and absence is invisible
    // through the model. The file itself is the only place the difference
    // survives.
    //
    // Anyone who did run Select Chain has `chain` written, including those who
    // chose mainnet deliberately, and is untouched either way.
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

      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        !('chain' in parsed)
      ) {
        await storeJson.merge(effects, { chain: 'regtest' })
      }
    },
    down: IMPOSSIBLE,
  },
})

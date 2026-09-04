import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

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
    // Now a no-op, and deliberately left in the graph rather than deleted: the
    // version has shipped, and an install coming from an older one still walks
    // through this node on its way to current.
    //
    // What it used to do was pin the chain an existing install was already
    // running. `defaultChain` moved from regtest to mainnet in this version,
    // and the store only gained a `chain` key when someone ran Select Chain, so
    // an install that never ran it would otherwise have read the new default
    // and walked onto mainnet unasked.
    //
    // There is no `chain` key any more. This package follows BLAKE2b on
    // mainnet and nothing else, so writing one here would write a key nothing
    // reads, and the schema no longer accepts it. The move onto mainnet that
    // this migration existed to prevent is now the intended outcome, and it is
    // described in the release notes of the version that made it so.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

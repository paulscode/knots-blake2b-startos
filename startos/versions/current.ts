import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes =
  'Fixes block explorers and wallet lookups against this node on the BLAKE2b ' +
  'chain. Anything asking for a block in detail, rather than as raw bytes, got ' +
  'an error for every block after the fork at 961640. Mempool Pruned could not ' +
  'show a block page at all, and Electrs Pruned could not answer a detailed ' +
  'transaction lookup. ' +
  ' ' +
  'The cause was the RPC proxy this node runs while pruning is on. It reads ' +
  'each block it is asked about, and it could not read a BLAKE2b block header, ' +
  'which is longer than an ordinary one. That affected every block after the ' +
  'fork, not only the ones pruning had discarded, so it was not limited to ' +
  'pruned nodes. Requests for raw block data were unaffected, which is why ' +
  'indexing kept working and this showed up only in the explorer. ' +
  ' ' +
  'The proxy is now a build that understands both header formats. Nothing to ' +
  'configure, and no change to how anything authenticates to this node.'

export const current = VersionInfo.of({
  version: '1.0.0:27',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    // Nothing to migrate. This version only swaps the proxy image for one that
    // can parse a header-v2 block; no setting, stored value or on-disk layout
    // changes, and the proxy holds no state of its own between starts.
    //
    // The `chain` pin that :26 needed lives in `v1_0_0_26.ts`, with the version
    // that introduced it, rather than being carried forward here.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

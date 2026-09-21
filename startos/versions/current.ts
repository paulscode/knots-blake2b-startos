import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes =
  'Fixes the RPC proxy refusing to parse blocks after the 1.0.0:36 update. ' +
  ' ' +
  'That update moved the node to Bitcoin Knots 29.4.2.knots20260508, which ' +
  'stopped reporting a "difficulty" field for blocks with the new header ' +
  'format and reports "difficulty_blake2b" instead. The proxy that sits in ' +
  'front of this node while pruning is on treated the old field as mandatory, ' +
  'so it could not read a single block header on this chain. Anything asking ' +
  'this node for a verbose block through it, an address indexer above all, got ' +
  'an error rather than a block. ' +
  ' ' +
  'The proxy now accepts either field and passes on whichever the node sent. ' +
  ' ' +
  'If you run Electrs Pruned, update it too: the same change in the node ' +
  'stopped it starting at all, and that is fixed in its 0.11.1:39. ' +
  ' ' +
  'Nothing about the node itself changes here, and no reindex or resync is ' +
  'needed.'

export const current = VersionInfo.of({
  version: '1.0.0:37',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    // Nothing to migrate: the change is in the binary. The 1.0.0:31 store
    // migration stays with :31.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

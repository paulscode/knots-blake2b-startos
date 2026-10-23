import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes = [
  'Other Settings has a new Block Reserved Weight setting: the block weight that block templates leave free for the coinbase transaction. A mining service can request it, for a coinbase that pays many outputs.',
  'Download UTXO Snapshot now works with https links. Before, the download failed with a certificate error.',
  'Built with start-sdk 3.1.0.',
  'Nothing you have set changes, and no reindex or resync is needed.',
].join(' ')

export const current = VersionInfo.of({
  version: '1.0.0:41',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    // Nothing to migrate: the SDK changed, and nothing on disk does.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

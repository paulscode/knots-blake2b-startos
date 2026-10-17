import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes = [
  'Rebuilt on version 3 of the StartOS packaging SDK, which needs StartOS 0.4.0.2.',
  'Nothing you have set changes, and no reindex or resync is needed.',
  'Settings files keep any key added to them by hand, as before.',
  'Delete Coinstats Index now deletes the right folder instead of failing with an error.',
  'A new Delete Block Filter Index action removes a corrupted block filter index so it can be rebuilt, which on a pruned node needs Reindex Blockchain.',
  'A new Peers health check fails when the node has had no outbound peers for five minutes.',
  'Blockchain Sync now reads "Catching up" with the number of blocks behind, rather than synced, when the node falls two or more blocks behind.',
  'New installs reject token transactions; existing nodes keep their current setting, which is Reject Tokens under Mempool Settings.',
].join(' ')

export const current = VersionInfo.of({
  version: '1.0.0:40',
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

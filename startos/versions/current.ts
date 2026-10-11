import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes =
  'Rebuilt on version 3 of the StartOS packaging SDK, which needs StartOS ' +
  '0.4.0.2. Nothing you have set changes, and no reindex or resync is needed. ' +
  ' ' +
  'Settings files keep any key added to them by hand, as before.'

export const current = VersionInfo.of({
  version: '1.0.0:39',
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

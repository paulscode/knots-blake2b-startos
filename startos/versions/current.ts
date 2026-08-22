import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.0:10',
  releaseNotes: {
    en_US: 'Rebuild against Knots fee27ccfe9. The branch was rebased, not advanced: nothing that runs on your node changed.',
    es_ES: 'Rebuild against Knots fee27ccfe9. The branch was rebased, not advanced: nothing that runs on your node changed.',
    de_DE: 'Rebuild against Knots fee27ccfe9. The branch was rebased, not advanced: nothing that runs on your node changed.',
    pl_PL: 'Rebuild against Knots fee27ccfe9. The branch was rebased, not advanced: nothing that runs on your node changed.',
    fr_FR: 'Rebuild against Knots fee27ccfe9. The branch was rebased, not advanced: nothing that runs on your node changed.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

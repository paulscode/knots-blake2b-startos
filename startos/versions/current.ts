import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.0:8',
  releaseNotes: {
    en_US: 'Add a Get Payout Address action, so an address can be obtained without a shell.',
    es_ES: 'Add a Get Payout Address action, so an address can be obtained without a shell.',
    de_DE: 'Add a Get Payout Address action, so an address can be obtained without a shell.',
    pl_PL: 'Add a Get Payout Address action, so an address can be obtained without a shell.',
    fr_FR: 'Add a Get Payout Address action, so an address can be obtained without a shell.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

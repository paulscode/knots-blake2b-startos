import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.0:11',
  releaseNotes: {
    en_US: 'Adds a Show Wallet Balance action, so you can see what mining has produced without a terminal.',
    es_ES: 'Adds a Show Wallet Balance action, so you can see what mining has produced without a terminal.',
    de_DE: 'Adds a Show Wallet Balance action, so you can see what mining has produced without a terminal.',
    pl_PL: 'Adds a Show Wallet Balance action, so you can see what mining has produced without a terminal.',
    fr_FR: 'Adds a Show Wallet Balance action, so you can see what mining has produced without a terminal.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

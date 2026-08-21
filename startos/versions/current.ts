import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.0:6',
  releaseNotes: {
    en_US: 'Activate BLAKE2b at height 1 by default so a Sia ASIC can mine immediately after install, and seed store.json on install.',
    es_ES: 'Activate BLAKE2b at height 1 by default so a Sia ASIC can mine immediately after install, and seed store.json on install.',
    de_DE: 'Activate BLAKE2b at height 1 by default so a Sia ASIC can mine immediately after install, and seed store.json on install.',
    pl_PL: 'Activate BLAKE2b at height 1 by default so a Sia ASIC can mine immediately after install, and seed store.json on install.',
    fr_FR: 'Activate BLAKE2b at height 1 by default so a Sia ASIC can mine immediately after install, and seed store.json on install.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

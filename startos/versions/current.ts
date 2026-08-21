import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.0:9',
  releaseNotes: {
    en_US: 'Hand out legacy addresses explicitly: the gateway cannot pay to a bech32 regtest address.',
    es_ES: 'Hand out legacy addresses explicitly: the gateway cannot pay to a bech32 regtest address.',
    de_DE: 'Hand out legacy addresses explicitly: the gateway cannot pay to a bech32 regtest address.',
    pl_PL: 'Hand out legacy addresses explicitly: the gateway cannot pay to a bech32 regtest address.',
    fr_FR: 'Hand out legacy addresses explicitly: the gateway cannot pay to a bech32 regtest address.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

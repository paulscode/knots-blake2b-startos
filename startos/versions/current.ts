import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.0:4',
  releaseNotes: {
    en_US: 'Use bitcoind cookie authentication instead of a generated RPC password, matching how the official Bitcoin and Datum packages share credentials.',
    es_ES: 'Use bitcoind cookie authentication instead of a generated RPC password, matching how the official Bitcoin and Datum packages share credentials.',
    de_DE: 'Use bitcoind cookie authentication instead of a generated RPC password, matching how the official Bitcoin and Datum packages share credentials.',
    pl_PL: 'Use bitcoind cookie authentication instead of a generated RPC password, matching how the official Bitcoin and Datum packages share credentials.',
    fr_FR: 'Use bitcoind cookie authentication instead of a generated RPC password, matching how the official Bitcoin and Datum packages share credentials.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

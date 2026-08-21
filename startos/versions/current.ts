import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.0:7',
  releaseNotes: {
    en_US: 'Make the P2P port LAN-reachable: secure null binds only to the internal bridge.',
    es_ES: 'Make the P2P port LAN-reachable: secure null binds only to the internal bridge.',
    de_DE: 'Make the P2P port LAN-reachable: secure null binds only to the internal bridge.',
    pl_PL: 'Make the P2P port LAN-reachable: secure null binds only to the internal bridge.',
    fr_FR: 'Make the P2P port LAN-reachable: secure null binds only to the internal bridge.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

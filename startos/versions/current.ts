import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes =
  'ZeroMQ works now. The node is built with the ZeroMQ library it was ' +
  'missing: since the setting appeared in 1.0.0:31 the node wrote the ' +
  'zmqpubrawblock and zmqpubrawtx lines it was asked for and silently ' +
  'ignored them, so nothing ever listened on the ZeroMQ ports this package ' +
  'exports. bitcoin-cli getzmqnotifications answered "Method not found". ' +
  ' ' +
  'WHO NEEDS IT. Lightning Fork subscribes to raw block and transaction ' +
  'notifications over ZeroMQ, and until now had to fall back to polling this ' +
  'node over RPC. With this release, and ZeroMQ Enabled under Actions and ' +
  'Config, Other Settings, it can use the feed. Nothing else in this store ' +
  'uses it, and it stays off by default, for the reason 1.0.0:33 gave: the ' +
  'feed has no password, so it belongs on this machine only. ' +
  ' ' +
  'Nothing changes for a node that keeps ZeroMQ off.'
export const current = VersionInfo.of({
  version: '1.0.0:34',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    // Nothing to migrate: the change is in the binary. The 1.0.0:31 store
    // migration stays with :31.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

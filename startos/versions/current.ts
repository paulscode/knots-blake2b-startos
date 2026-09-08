import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes =
  'ZeroMQ is now off on a fresh install. Nothing changes for a node that is ' +
  'already running: whatever it has now, it keeps. ' +
  ' ' +
  'WHY. ZeroMQ is a stream of block and transaction notifications, and it has ' +
  'no password and no encryption of any kind. Anyone who can reach the port ' +
  'gets the feed. That is fine for what it was built for, a program on the ' +
  'same machine, and it is why Bitcoin itself ships it off. ' +
  ' ' +
  'It was on here, which meant every new install published two interfaces that ' +
  'could be put on a public address. Somebody who accepted the defaults and ' +
  'turned on a tunnel ended up exposing that feed to the internet without ' +
  'choosing to. That is what prompted this. ' +
  ' ' +
  'NOTHING NEEDS IT. The Datum Gateway companion, the only service that ' +
  'depends on this node, takes its work over RPC and has no ZeroMQ support at ' +
  'all. Neither does Electrs Pruned or Mempool Pruned. If you have wired ' +
  'something to it yourself, turn it back on under Actions and Config, Other ' +
  'Settings, ZeroMQ Enabled. ' +
  ' ' +
  'It also settles a difference between two installs of the same version. The ' +
  'setting was written once, at install, so a fresh install had ZeroMQ on and ' +
  'showed two extra interfaces while one that updated into the same version ' +
  'had neither. Both are off now.'

export const current = VersionInfo.of({
  version: '1.0.0:33',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    // Nothing to migrate. The change is what a fresh install is seeded with, so
    // an existing node keeps the setting it already has and its dependents keep
    // working. The 1.0.0:31 store migration stays with :31.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

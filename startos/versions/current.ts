import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes =
  'This release can join the public BLAKE2b test network (testnet4), not just a private chain. ' +
  'Use the new Select Chain action to pick one. Nothing is deleted when you switch: each chain ' +
  'keeps its own data, so switching back returns you to where you left off. ' +
  'On the public network you must add peers by hand with the new Set Peers action, because ' +
  'testnet4’s DNS seeds return ordinary nodes that are not on the fork; without a fork peer the ' +
  'node syncs to one block below the activation height and stops there. ' +
  'A new Chain health check reports which of those two situations you are in, rather than just ' +
  'that the node is running. ' +
  'The node itself is rebuilt from the Bitcoin Knots release candidate v29.4.1.knots20260508rc2 ' +
  'instead of a development branch, which is a different consensus revision and is what knows ' +
  'the testnet4 activation height. Private chains behave exactly as before.'

export const current = VersionInfo.of({
  version: '1.0.0:13',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    // Nothing to migrate. The repin changes the binary, and chain selection adds
    // store fields that all carry defaults, so an existing install reads as
    // `regtest` and keeps the chain it already has under /data/regtest.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

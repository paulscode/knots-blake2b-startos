import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes =
  'This release can join the public BLAKE2b test network (testnet4), not just a private chain. ' +
  'Use the new Select Chain action to pick one. Nothing is deleted when you switch: each chain ' +
  'keeps its own data, so switching back returns you to where you left off. ' +
  'It ships with peers for the public network, so choosing that network is all you have to do. ' +
  'They are needed because testnet4’s own peer discovery returns nodes that are not on the fork, ' +
  'and without one the node syncs to a block below the activation height and stops there. The new ' +
  'Set Peers action is there for if the shipped ones go offline. ' +
  'On the public network the headline is set for you, because that chain has already committed ' +
  'to one and a node that disagrees rejects the first BLAKE2b block. The headline setting now ' +
  'applies to private chains only. ' +
  'A new Chain health check reports which of those two situations you are in, rather than just ' +
  'that the node is running. ' +
  'Other services on this server can now pull historical blocks from it without being ' +
  'disconnected, which an Electrum server needs. ' +
  'The node itself is rebuilt from the Bitcoin Knots release candidate v29.4.1.knots20260508rc2 ' +
  'instead of a development branch, which is a different consensus revision and is what knows ' +
  'the testnet4 activation height. Private chains behave exactly as before.' +
  'Adds chain selection for deployments without a settings form. On StartOS nothing changes: the Select Chain action remains the way to switch.'

export const current = VersionInfo.of({
  version: '1.0.0:17',
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

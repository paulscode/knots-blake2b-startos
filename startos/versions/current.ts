import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes =
  'Follows the current public BLAKE2b test network. The test network was restarted on a ' +
  'later Bitcoin Knots release candidate, which moved where BLAKE2b begins from block ' +
  '149537 to block 150027 and changed the headline that block commits to. Those two values ' +
  'are consensus, so the previous release cannot follow the chain that is live now: it ' +
  'expects the fork at a height where the live chain still has an ordinary block, and stops ' +
  'there. This release is rebuilt from that candidate, v29.4.1.knots20260508rc3, and knows ' +
  'both new values. ' +
  'If you were on the public network, your node has been stuck below the fork and will ' +
  'resume on its own once this release starts. Nothing is deleted and no action is needed. ' +
  'Private chains are unaffected: you choose the activation height and headline there, and ' +
  'neither is touched by this.'

export const current = VersionInfo.of({
  version: '1.0.0:18',
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

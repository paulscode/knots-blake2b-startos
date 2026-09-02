import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes =
  'Moves to the final Bitcoin Knots 29.4.1 release. Every version of this package ' +
  'so far has been built from a release candidate, because there was no release to ' +
  'build from. There is now.' +
  ' ' +
  'The consensus rules do not change. The activation height stays 961640, the ' +
  'difficulty shift at that height stays the same, and the opt-in signature hash ' +
  'that gives replay protection is the one already shipped. A node running the ' +
  'previous version is on the same chain as one running this, and updating is not ' +
  'urgent for correctness. ' +
  ' ' +
  'What it does bring is better peer selection. The node now prefers peers that ' +
  'advertise the fork for its first outbound connections, and paces its use of DNS ' +
  'seeds by how many such peers it already has. Finding peers on this chain has been ' +
  'the awkward part of running it: both chains share a port and a message prefix, so ' +
  'a node that dials ordinary peers stalls one block below the fork while looking ' +
  'perfectly healthy. This release addresses that in the node itself rather than ' +
  'leaving it to a list of addresses shipped by a package. ' +
  ' ' +
  'It also carries a checkpoint at the first BLAKE2b block, and sets its assumed-valid ' +
  'block and minimum chain work from this chain rather than the one it parted from, ' +
  'which makes a fresh sync faster and harder to mislead. ' +
  ' ' +
  'The public test network is still refused, for the same reason as before: this ' +
  'release schedules BLAKE2b on testnet4 at a height that network passed without ' +
  'forking, so the two are different chains. Use the private test chain or mainnet.'

export const current = VersionInfo.of({
  version: '1.0.0:29',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    // Nothing to migrate. The consensus rules are unchanged, so the existing chain
    // data stays valid and no reindex is needed; the node picks up the new peer
    // selection and checkpoint on next start.
    //
    // The `chain` pin that :26 needed lives in `v1_0_0_26.ts`, with the version
    // that introduced it, rather than being carried forward here.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

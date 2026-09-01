import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes =
  'Fixes a way to end up on mainnet without the headline mainnet requires. The ' +
  'chain can be written as either `mainnet` or `main`, and only the first spelling ' +
  'reached the step that supplies the consensus headline for that chain. A node ' +
  'started as `main` therefore ran on mainnet with whatever headline it had been ' +
  'given, and since the headline is checked at the fork height, it would reject ' +
  'block 961640 and every block after it. That looks like a peer problem rather ' +
  'than a misconfiguration: the node sits one block below the fork, fully ' +
  'connected, and never moves. ' +
  ' ' +
  'The spelling is now settled before anything reads it, so both forms behave the ' +
  'same. Nobody who set the chain from the Settings page or left it at the default ' +
  'was affected, because both of those produce `mainnet`. ' +
  ' ' +
  'On the private test chain the activation height is now always written alongside ' +
  'the headline, rather than only when one was supplied. Without a height that ' +
  'chain never actually activates BLAKE2b, which is the one thing this package is ' +
  'for, and a coming upstream release refuses to start when the two are separated. ' +
  'It defaults to 1, which is what both the Settings page and the Umbrel package ' +
  'already send. Mainnet is unaffected: its height is compiled in and was never ' +
  'settable here.'

export const current = VersionInfo.of({
  version: '1.0.0:28',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    // Nothing to migrate. This version only changes how the generated bitcoin.conf
    // is built at startup; no setting, stored value or on-disk layout changes.
    //
    // A node that had been running as `main` with a wrong headline needs no
    // migration either: it was stalled below the fork rather than holding bad data,
    // so it resumes from where it stopped once the headline is right.
    //
    // The `chain` pin that :26 needed lives in `v1_0_0_26.ts`, with the version
    // that introduced it, rather than being carried forward here.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

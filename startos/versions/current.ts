import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes =
  'Updates Bitcoin Knots to the build carrying the temporary long coinbase ' +
  'maturity rule. ' +
  ' ' +
  'Newly mined coins now need 6480 confirmations before they can be spent, ' +
  'roughly 45 days at a ten minute block target, where the old wait was 100 ' +
  'blocks. The consensus rule begins being enforced at block 973440. ' +
  ' ' +
  'This also affects coins you have already mined. Nodes require the longer ' +
  'wait of every coinbase spend they will relay, whatever height the coin was ' +
  'mined at, so a payout from the last 45 days that was spendable before this ' +
  'update will not be spendable after it. Nothing is lost; the wait is longer. ' +
  ' ' +
  'This build is a release candidate, v29.4.2.knots20260508rc2, rather than a ' +
  'final release. No final release carries the rule yet, and a node without it ' +
  'will accept blocks that updated nodes reject. Update again when a final ' +
  'release ships. ' +
  ' ' +
  'If you update after your node has already passed block 973440, it rewinds ' +
  'and revalidates the blocks from that height before it is usable again, ' +
  'which takes a while. Updating before that height avoids the rewind.'

export const current = VersionInfo.of({
  version: '1.0.0:36',
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

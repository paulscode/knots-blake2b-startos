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
  'Update before your node reaches block 973440 if you can. A node running ' +
  'this build from before that height checks the new rule as it goes and never ' +
  'has to look back. ' +
  ' ' +
  'A node updated after it has passed 973440 has to rewind to that block and ' +
  'recheck everything since, which takes a while and needs the block data for ' +
  'that stretch still on disk. This app prunes, so that data does not stay ' +
  'forever. At the default pruning size there is plenty of room, but if you ' +
  'have set pruning low and update long after 973440, the node can refuse to ' +
  'start and report that required block data has been pruned. Recovering from ' +
  'that means downloading the chain again. Updating promptly avoids the ' +
  'question entirely.'

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

import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes =
  'Updates the RPC proxy this node runs to upstream 0.8.1. ' +
  ' ' +
  'The two defects this package carried a patched proxy for are now fixed ' +
  'upstream, in Start9 btc-rpc-proxy 0.8.1, so this build is their 0.8.1 with ' +
  'one patch on top rather than their 0.8.0 with three. Both defects stopped ' +
  'anything depending on this node: a block mined during SegWit signalling ' +
  'was refused as malformed, which pinned a pruned index at mainnet 434,499 ' +
  'forever, and the RPC cookie was read once at startup, so from this node\'s ' +
  'next restart its dependents were answered 401 and nothing said why. ' +
  ' ' +
  'The remaining patch is BLAKE2b header support, which is still open ' +
  'upstream as PR #33. Without it the proxy cannot parse a 164-byte header, ' +
  'and every verbose getblock above 961640 fails on a block this node still ' +
  'holds. ' +
  ' ' +
  'Nothing changes in how the node behaves. This is the proxy beside it.'

export const current = VersionInfo.of({
  version: '1.0.0:35',
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

import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes =
  'Fixes two faults in the RPC proxy this node runs when it is pruned. The ' +
  'proxy is what lets a pruned node still answer for blocks it has dropped, ' +
  'by fetching them from the network, so anything that depends on this node ' +
  'for history goes through it. Either fault stops that dependent dead, and ' +
  'neither clears on its own. ' +
  ' ' +
  'BLOCK 434,499. Every fetch of history stopped at that block and stayed ' +
  'there. It was mined in 2016 while SegWit was still being signalled, which ' +
  'gives it an unusual but perfectly valid shape, and the proxy mistook that ' +
  'shape for a block a peer had tampered with. Since every peer returns the ' +
  'same block, every peer looked like it was lying, so the block was never ' +
  'fetched. An indexer such as Electrs sat and retried it forever while ' +
  'reporting no progress. ' +
  ' ' +
  'AFTER A RESTART. The proxy read this node’s cookie once when it started ' +
  'and kept that copy. Bitcoin writes a new cookie every time it starts, so ' +
  'from this node’s next restart the proxy rejected every request its ' +
  'dependents made. That is self-inflicted by any ordinary update, and ' +
  'restarting the dependent did not help, because the stale copy was in the ' +
  'proxy. Only restarting this node a second time cleared it. ' +
  ' ' +
  'Nothing is lost and nothing resyncs. A dependent that was stuck picks up ' +
  'where it stopped. ' +
  ' ' +
  'Both faults are in the upstream proxy rather than anything specific to the ' +
  'BLAKE2b chain, and both fixes have been sent upstream.'

export const current = VersionInfo.of({
  version: '1.0.0:32',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    // Nothing to migrate. The change is the proxy image this package runs, so
    // it takes effect when the proxy container is next started. The 1.0.0:31
    // store migration stays with :31.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

import { VersionGraph } from '@start9labs/start-sdk'
import { current } from './current'
import { v1_0_0_26 } from './v1_0_0_26'
import { v1_0_0_31 } from './v1_0_0_31'

// v1_0_0_26 stays in the graph so an install coming from below it still has a
// node to walk through. Its migration is a no-op now; see the file.
//
// v1_0_0_31 carries the store-to-bitcoin.conf migration, so it has to stay a
// node of its own: an install below it still needs to walk through that step.
// Only versions with nothing to migrate can be folded into `current`.
export const versionGraph = VersionGraph.of({
  current,
  other: [v1_0_0_26, v1_0_0_31],
})

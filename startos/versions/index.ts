import { VersionGraph } from '@start9labs/start-sdk'
import { current } from './current'
import { v1_0_0_26 } from './v1_0_0_26'

// v1_0_0_26 stays in the graph so an install coming from below it still has a
// node to walk through. Its migration is a no-op now; see the file.
export const versionGraph = VersionGraph.of({
  current,
  other: [v1_0_0_26],
})

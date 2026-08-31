import { VersionGraph } from '@start9labs/start-sdk'
import { current } from './current'
import { v1_0_0_26 } from './v1_0_0_26'

export const versionGraph = VersionGraph.of({
  current,
  other: [v1_0_0_26],
})

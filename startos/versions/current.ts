import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.0:12',
  releaseNotes: {
    en_US: "Fixes the build: earlier releases were still compiled from the older Knots commit, not the one their notes named. Nothing your node does changes.",
    es_ES: "Fixes the build: earlier releases were still compiled from the older Knots commit, not the one their notes named. Nothing your node does changes.",
    de_DE: "Fixes the build: earlier releases were still compiled from the older Knots commit, not the one their notes named. Nothing your node does changes.",
    pl_PL: "Fixes the build: earlier releases were still compiled from the older Knots commit, not the one their notes named. Nothing your node does changes.",
    fr_FR: "Fixes the build: earlier releases were still compiled from the older Knots commit, not the one their notes named. Nothing your node does changes.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

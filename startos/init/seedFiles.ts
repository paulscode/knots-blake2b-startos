import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'

/**
 * Create store.json with its defaults on install, so the file exists for the
 * user to edit and main() has something to read.
 *
 * `merge(effects, {})` fills every missing field from its `.catch()` default and
 * repairs invalid ones, without stripping keys we did not name.
 */
export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') return
  await storeJson.merge(effects, {})
})

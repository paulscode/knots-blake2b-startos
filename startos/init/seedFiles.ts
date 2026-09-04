import {
  bitcoinConfFile,
  defaultDatacarriercost,
  defaultDbbatchsize,
  defaultDbcache,
  defaultPruneMib,
} from '../fileModels/bitcoin.conf'
import { i2pdConfFile } from '../fileModels/i2pd.conf'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { i2PSamAddress } from '../utils'

export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  if (!kind) return

  // install, update, restore
  await storeJson.merge(effects, {})
  await i2pdConfFile.merge(effects, {})

  if (kind === 'install') {
    await bitcoinConfFile.merge(effects, {
      zmqEnabled: true,
      blockfilters: { blockfilterindex: true },
      dbcache: defaultDbcache(),
      dbbatchsize: defaultDbbatchsize(),
      natpmp: false,
      datacarriercost: defaultDatacarriercost,
      // Pruned on every fresh install, where the official package prunes only
      // on a small disk. This node exists to sit beside one on the other chain,
      // and pruning costs a dependent nothing here because main.ts runs
      // btc-rpc-proxy in front of it whenever this is non-zero.
      prune: defaultPruneMib,
      raw: {
        i2psam: i2PSamAddress,
      },
    })
  } else {
    await bitcoinConfFile.merge(effects, {})
  }
})

import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { i2pdConfFile } from '../fileModels/i2pd.conf'

const notes =
  'Brings in the fixes Start9 has made to its own Bitcoin package since this ' +
  'one was built from it, and a newer RPC proxy. ' +
  ' ' +
  'The bundled I2P router now carries only this node\'s traffic. It used to ' +
  'relay up to 32 KB/s for other I2P users by default, in i2pd\'s lowest ' +
  'bandwidth class, where a router behind a home connection rarely gets its ' +
  'address publication confirmed in time. Relaying is now off and the class is ' +
  'raised to O, which costs nothing once relaying is off. Both changes are made ' +
  'once, even over values you set by hand; afterwards anything you set in ' +
  'i2pd.conf sticks, including turning relaying back on. The router\'s routine ' +
  'network chatter is also filtered out of the service log, which it used to ' +
  'fill at about 25 lines a minute. ' +
  ' ' +
  'Blockchain Sync now shows what the node is doing while it starts, such as ' +
  'loading the block index or replaying blocks after an unclean shutdown, ' +
  'instead of only "starting", and counts block headers before the first block ' +
  'arrives. A new Index Sync check shows progress while an index you have ' +
  'turned on is being built. ' +
  ' ' +
  'Restore Wallet no longer reports a failure after 30 seconds while the ' +
  'restore carries on in the background. Peer Settings refuses to turn off ' +
  'the I2P proxy while Onlynet is limited to i2p alone, which would leave the ' +
  'node unable to connect. ' +
  ' ' +
  'The RPC proxy moves to 0.8.2. It answers JSON-RPC 2.0 requests in 2.0 and ' +
  'returns batched replies in the order they were asked, and a block it fetches ' +
  'from peers is fetched once and cached even if the client that asked for it ' +
  'gives up waiting. ' +
  ' ' +
  'No reindex or resync is needed.'

export const current = VersionInfo.of({
  version: '1.0.0:38',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    up: async ({ effects }) => {
      // Move the i2pd router off the two old shipped defaults, once: the 'L'
      // bandwidth class, and relaying transit for other I2P users. A hand-set
      // value is indistinguishable from the default it replaced, so both are
      // moved and both are disclosed in the release notes. Rationale:
      // fileModels/i2pd.conf.ts. Ported from bitcoin-core-startos c5d31ca.
      // Guarded: the read is null-safe where i2pd.conf does not exist yet, and
      // the whole step is caught because neither move is worth aborting an
      // update over.
      try {
        const conf = await i2pdConfFile.read().once()
        await i2pdConfFile.merge(effects, {
          ...(conf?.bandwidth === 'L' && { bandwidth: 'O' as const }),
          ...(conf?.notransit === false && { notransit: true }),
        })
      } catch (e) {
        console.error('i2pd router defaults not moved:', e)
      }
    },
    down: IMPOSSIBLE,
  },
})

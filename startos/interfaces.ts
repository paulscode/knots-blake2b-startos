import { i18n } from './i18n'
import { sdk } from './sdk'
import { peerPort, rpcHostId, rpcPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  // RPC. Carries credentials, so it is masked. The gateway reaches this through
  // the dependency mechanism rather than over the LAN.
  const rpcMulti = sdk.MultiHost.of(effects, rpcHostId)
  const rpcOrigin = await rpcMulti.bindPort(rpcPort, {
    protocol: 'http',
    preferredExternalPort: rpcPort,
  })
  const rpc = sdk.createInterface(effects, {
    name: i18n('RPC'),
    id: 'rpc',
    description: i18n('Bitcoin JSON-RPC. Used by the BLAKE2b gateway.'),
    type: 'api',
    masked: true,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  // P2P, so two of these nodes can find each other for a multi-machine test.
  // There is no public network for this chain to join.
  const peerMulti = sdk.MultiHost.of(effects, 'peer')
  const peerOrigin = await peerMulti.bindPort(peerPort, {
    protocol: null,
    preferredExternalPort: peerPort,
    addSsl: null,
    secure: null,
  })
  const peer = sdk.createInterface(effects, {
    name: i18n('Peer'),
    id: 'peer',
    description: i18n('P2P for connecting to another BLAKE2b regtest node.'),
    type: 'p2p',
    masked: false,
    schemeOverride: { ssl: null, noSsl: null },
    username: null,
    path: '',
    query: {},
  })

  return [await rpcOrigin.export([rpc]), await peerOrigin.export([peer])]
})

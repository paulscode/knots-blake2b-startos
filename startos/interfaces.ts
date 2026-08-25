import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  peerLocalHostId,
  peerPort,
  peerPortLocal,
  rpcHostId,
  rpcPort,
} from './utils'

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

  // P2P. On regtest this is how two of these nodes find each other for a
  // multi-machine test; on testnet4 it is how this node reaches the rest of the
  // BLAKE2b network, which it cannot do through the DNS seeds.
  const peerMulti = sdk.MultiHost.of(effects, 'peer')
  const peerOrigin = await peerMulti.bindPort(peerPort, {
    protocol: null,
    addSsl: null,
    preferredExternalPort: peerPort,
    // Plaintext by design: regtest P2P between two lab nodes. `secure: null`
    // would make this bridge-only and unreachable from another machine.
    secure: { ssl: false },
  })
  const peer = sdk.createInterface(effects, {
    name: i18n('Peer'),
    id: 'peer',
    description: i18n('P2P for connecting to other BLAKE2b nodes.'),
    type: 'p2p',
    masked: false,
    schemeOverride: { ssl: null, noSsl: null },
    username: null,
    path: '',
    query: {},
  })

  // Whitelisted p2p for services on the bridge, e.g. an Electrum server that
  // pulls historical blocks. Deliberately not exported: an unexported binding
  // stays off the LAN, so the noban permissions are reachable only from the
  // bridge and a public peer keeps arriving on `peer`'s plain listener. See
  // peerLocalHostId in utils.ts for why a dependent needs this at all.
  await sdk.MultiHost.of(effects, peerLocalHostId).bindPort(peerPortLocal, {
    protocol: null,
    preferredExternalPort: peerPortLocal,
    addSsl: null,
    secure: { ssl: false },
  })

  return [await rpcOrigin.export([rpc]), await peerOrigin.export([peer])]
})

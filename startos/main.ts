import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  dataDir,
  defaultActivationHeight,
  defaultHeadline,
  rpcPort,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Bitcoin Knots BLAKE2b (regtest)'))

  // Tolerate an absent store rather than refusing to start: every field has a
  // default, so there is nothing here that a missing file makes unsafe.
  const store = await storeJson.read().const(effects)

  const env = {
    CHAIN: 'regtest',
    BLAKE2B_HEADLINE: store?.blake2bHeadline ?? defaultHeadline,
    BLAKE2B_ACTIVATION_HEIGHT: String(store?.activationHeight ?? defaultActivationHeight),
    PRUNE: String(store?.prune ?? 1),
    FASTPRUNE: (store?.fastprune ?? true) ? '1' : '0',
    // No RPC_USER/RPC_PASSWORD: bitcoind writes a .cookie into the datadir and
    // the gateway reads it through a read-only mount of this volume. Nothing
    // here has to generate or store an RPC secret.
    //
    // The bridge is the only route to this port; it is never published to the
    // LAN. `rpcallowip` is wide because the bridge address is not knowable here.
    RPC_ALLOW_IP: '0.0.0.0/0',
  }

  const subcontainer = sdk.SubContainer.of(
    effects,
    { imageId: 'knots' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: dataDir,
      readonly: false,
    }),
    'knots-node',
  )

  return (
    sdk.Daemons.of(effects)
      // StartOS mounts volumes root-owned on every start and the image runs as
      // the unprivileged `bitcoin` user, so without this the node cannot write
      // its own bitcoin.conf. Found the hard way: the package built, packed and
      // installed clean, then crash-looped on `/data/bitcoin.conf: Permission
      // denied`. A oneshot rather than a migration because it is a fact about
      // the volume re-asked every start, not about our version.
      .addOneshot('chown', {
        subcontainer,
        exec: {
          command: ['chown', '-R', 'bitcoin:bitcoin', dataDir],
          user: 'root',
        },
        requires: [],
      })
      .addDaemon('node', {
        subcontainer,
        exec: { command: ['/usr/local/bin/entrypoint.sh'], env },
        ready: {
          display: i18n('RPC'),
          fn: () =>
            sdk.healthCheck.checkPortListening(effects, rpcPort, {
              successMessage: i18n('The node is accepting RPC'),
              errorMessage: i18n('The node is not accepting RPC yet'),
            }),
        },
        requires: ['chown'],
      })
  )
})

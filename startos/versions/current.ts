import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes =
  'Rebuilt from the Bitcoin Knots release candidate v29.4.1.knots20260508rc2 instead of the ' +
  'development branch. This is a different consensus revision, so your node is restarted onto ' +
  'new code. Regtest behaviour is unchanged and was re-verified. The reason for the change is ' +
  'that this build knows the BLAKE2b activation height for testnet4, which the previous one did ' +
  'not; this package still runs regtest only, and chain selection comes in a later release.'

export const current = VersionInfo.of({
  version: '1.0.0:13',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    // Nothing to migrate. The repin changes the binary, not anything this
    // package has written to disk, and a regtest chain is disposable anyway.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

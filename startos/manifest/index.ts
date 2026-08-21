import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  // Deliberately NOT `bitcoind`: that is the official Bitcoin Knots package, and
  // both must be installable at once. The id is effectively immutable (the
  // registry indexes by (id, version, sighash) and there is no rename path), so
  // `regtest` is kept out of it and carried in the title instead. See PLAN Q12.
  id: 'knots-blake2b',
  title: 'Bitcoin Knots BLAKE2b (regtest)',
  license: 'MIT',
  packageRepo: 'https://github.com/paulscode/knots-blake2b-startos',
  upstreamRepo: 'https://github.com/bitcoinknots/bitcoin',
  marketingUrl: 'https://bitcoinknots.org/',
  donationUrl: null,
  description: { short, long },
  volumes: ['main'],
  images: {
    knots: {
      source: {
        dockerBuild: {
          dockerfile: 'Dockerfile',
          workdir: '.',
          buildArgs: {
            // Pinned by commit, never by branch. `pow_hf_blake2b` is a moving
            // development branch; a floating build would silently cross
            // consensus revisions between package versions.
            KNOTS_REF: '95ecbc35e540b8e3784790d101e6fbeb3aca01a9',
          },
        },
      },
      arch: ['x86_64', 'aarch64'],
    },
  },
  dependencies: {},
})

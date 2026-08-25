import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  // Deliberately NOT `bitcoind`: that is the official Bitcoin Knots package, and
  // both must be installable at once. The id is effectively immutable (the
  // registry indexes by (id, version, sighash) and there is no rename path), so
  // the chain was kept out of it and carried in the title instead. See PLAN Q12.
  // That decision paid off: the package now runs testnet4 as well as regtest,
  // and the title could follow while the id could not have.
  id: 'knots-blake2b',
  title: 'Bitcoin Knots BLAKE2b',
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
          // No buildArgs on purpose. The pin belongs in exactly one place, and
          // that place is the Dockerfile's ARG default. Setting it here as well
          // silently overrode it: the Dockerfile was moved to fee27ccfe9 and this
          // was left on 95ecbc35e5, so every StartOS build kept fetching the
          // commit the rebase had orphaned. One source of truth, and this is
          // not it.
        },
      },
      arch: ['x86_64', 'aarch64'],
    },
  },
  dependencies: {},
})

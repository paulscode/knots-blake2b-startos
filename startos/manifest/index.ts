import { setupManifest } from '@start9labs/start-sdk'
import { long, short, torDescription } from './i18n'

export const manifest = setupManifest({
  // Deliberately NOT `bitcoind`: that is the official Bitcoin Knots package, and
  // both must be installable at once. The id is effectively immutable (the
  // registry indexes by (id, version, sighash) and there is no rename path), so
  // the chain was kept out of it and carried in the title instead. See PLAN Q12.
  // That decision paid off: this package has run regtest, then testnet4, then
  // mainnet, and now mainnet alone. The title followed each time; the id could
  // not have.
  id: 'knots-blake2b',
  title: 'Bitcoin Knots (BLAKE2b) Companion',
  license: 'MIT',
  packageRepo: 'https://github.com/paulscode/knots-blake2b-startos',
  upstreamRepo: 'https://github.com/bitcoinknots/bitcoin',
  marketingUrl: 'https://bitcoinknots.org/',
  donationUrl: null,
  description: { short, long },
  volumes: ['main', 'i2pd'],
  images: {
    // Named `bitcoind` rather than `knots`, matching the official package, because
    // nineteen call sites across the actions reference it by that id.
    bitcoind: {
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
          //
          // This is also why the image is built from source rather than from a
          // signed release tarball the way the official Knots package does.
          // There is no published release for a BLAKE2b tag, so there is no
          // artifact and no detached signature to check against a signer quorum.
          // See README.md; it is a real reduction in assurance and is stated
          // there rather than glossed.
        },
      },
      arch: ['x86_64', 'aarch64'],
    },
    // Serves the blocks a pruned node has dropped, by fetching them from peers
    // and checking each against this node. Started only when pruning is on; see
    // main.ts.
    //
    // OUR BUILD, not `ghcr.io/start9labs/btc-rpc-proxy`, and this is the one
    // image substitution that is load-bearing rather than cosmetic. Stock v0.8.0
    // cannot parse a 164-byte BLAKE2b header, and it parses the block for any
    // request it intercepts, not only one it had to fetch from peers. So every
    // verbose `getblock` and every intercepted `getrawtransaction` above block
    // 961640 returned "IO error: failed to fill whole buffer", on blocks this
    // node still had. Verbosity 0 was unaffected, which is why indexing worked
    // and this looked like it only mattered later.
    //
    // Carries PR #33. Swap back to the Start9 image once that lands upstream.
    proxy: {
      source: {
        dockerTag: 'paulscode/btc-rpc-proxy:v0.8.0-blake2b.1',
      },
      arch: ['x86_64', 'aarch64'],
    },
    python: {
      source: {
        dockerTag: 'python:3.14.2-alpine',
      },
      arch: ['x86_64', 'aarch64'],
    },
    i2pd: {
      source: {
        dockerTag: 'purplei2p/i2pd:release-2.58.0',
      },
      arch: ['x86_64', 'aarch64'],
      emulateMissingAs: 'x86_64',
    },
  },
  dependencies: {
    tor: {
      description: torDescription,
      optional: true,
      metadata: {
        title: 'Tor',
        icon: 'https://raw.githubusercontent.com/Start9Labs/tor-startos/65faea17febc739d910e8c26ff4e61f6333487a8/icon.svg',
      },
    },
  },
})

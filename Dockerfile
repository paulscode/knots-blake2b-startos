# Bitcoin Knots with the BLAKE2b proof-of-work change.
#
# Pinned by commit, never by branch: a floating build would silently cross
# consensus revisions (PLAN section 8). The commit below is the tag
# v29.4.1.knots20260508, the final release rather than a candidate, recorded as
# a SHA because a tag can be moved and a SHA cannot.
#
# Why this tag rather than luke-jr's development branch: the testnet4 BLAKE2b
# activation height (150027) is compiled into CTestNet4Params, and it is only
# there in the bitcoinknots release-candidate tags. Regtest works from either
# tree, because there the height comes from -testactivationheight=blake2b@N, but
# testnet4 needs this one.
#
# This image serves a mainnet node. rc2 and rc3 refused ChainType::MAIN outright
# at init.cpp ("This release candidate only supports test networks"); rc4 removed
# that guard, because BLAKE2b activated on mainnet at height 961640 on 2026-08-30.
#
# The consensus parameters are the ones this package has carried since rc4 and are
# unchanged here: Blake2bHeight 961640, Blake2bTargetShift 22, and SIGHASH_UNIFIED
# for the opt-in signature hash. What the final adds over rc4 is the mainnet
# headline hardcode, a checkpoint at 961640, peer selection that prefers
# NODE_BLAKE2B for the first outbound slots, and assumevalid and minimum chain work
# anchored to a block on the BLAKE2b chain rather than the other one.
#
# What it cannot serve, as of this pin, is the public test network. This release
# still compiles testnet4's activation at 150308, and the live testnet4 chain
# activated at 150027 and has passed 150308 already, so the two are different
# chains. Worth re-checking whenever the pin moves: the height has been re-cut
# before, and a testnet4 restart on 150308 would make this refusal wrong.
# entrypoint.sh refuses testnet4 rather than letting it stall at 150026, which
# is what that mismatch looks like from the outside.

# Why the activation height and the headline are not build arguments: both are
# compiled into chainparams and checked by consensus, and both are re-cut by
# upstream at every release candidate. See UPDATING.md.
#
# blake2b_headline is no longer mandatory on every chain, and is no longer read on
# mainnet at all: this release hardcodes the mainnet headline into chainparams and
# demotes the option to a regtest-only one. entrypoint.sh still writes it on every
# chain, which is deliberate. The option stays registered for all of them, so
# passing it where it is ignored is not an error, and the string forced on mainnet
# is byte-identical to the one compiled in, so the line is a no-op there rather
# than a disagreement. On regtest it is still read, and throws unless
# -testactivationheight=blake2b@<height> is set with it; see entrypoint.sh.
#
# There are no published binaries for this tag yet: bitcoinknots.org and the
# GitHub releases page both stop at 29.4.knots20260508, so there is no artifact
# and no detached signature to check. Building from source here trades the
# signed-release trust model for a pinned git commit, which is a real reduction
# in assurance and is stated in the README.
#
# Unlike the candidates this package pinned before, the tag does carry
# reproducible-build attestations in bitcoinknots/guix.sigs, from four builders
# as of 2026-09-02. That is not a signature over anything this image downloads,
# so it does not change what the build verifies; it does mean independent parties
# have rebuilt this commit and agreed on the output.
FROM debian:bookworm-slim AS build

ARG KNOTS_REPO=https://github.com/bitcoinknots/bitcoin.git
ARG KNOTS_REF=8c85b1585dac23f964e2dd32045624de7f02aa58

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential cmake pkgconf python3 git ca-certificates \
        libevent-dev libsqlite3-dev libboost-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN git init -q \
 && git remote add origin "$KNOTS_REPO" \
 && git fetch -q --depth 1 origin "$KNOTS_REF" \
 && git checkout -q FETCH_HEAD \
 && echo "$KNOTS_REF" > /src/PINNED_COMMIT

RUN cmake -B build \
        -DCMAKE_BUILD_TYPE=Release \
        -DBUILD_GUI=OFF \
        -DBUILD_TESTS=OFF \
        -DBUILD_BENCH=OFF \
        -DBUILD_FUZZ_BINARY=OFF \
        -DENABLE_WALLET=ON \
 && cmake --build build -j"$(nproc)" --target bitcoind bitcoin-cli \
 && strip build/bin/bitcoind build/bin/bitcoin-cli

# ----------------------------------------------------------------------
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        libevent-core-2.1-7 libevent-extra-2.1-7 libevent-pthreads-2.1-7 \
        libsqlite3-0 wget \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -r -m -d /data -u 1000 bitcoin

COPY --from=build /src/build/bin/bitcoind /src/build/bin/bitcoin-cli /usr/local/bin/
COPY --from=build /src/PINNED_COMMIT /etc/knots-pinned-commit
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

VOLUME /data
EXPOSE 18443 18444
# Create the settings mountpoint owned by the runtime user. A named volume
# inherits the ownership of the image directory it covers, so doing this here
# is what makes a fresh volume writable without anything running as root.
RUN mkdir -p /config && chown bitcoin:bitcoin /config

USER bitcoin
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

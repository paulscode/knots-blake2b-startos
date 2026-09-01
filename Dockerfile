# Bitcoin Knots with the BLAKE2b proof-of-work change.
#
# Pinned by commit, never by branch: a floating build would silently cross
# consensus revisions (PLAN section 8). The commit below is the tag
# v29.4.1.knots20260508rc4, recorded as a SHA because a release candidate's tag
# can be moved and a SHA cannot.
#
# Why this tag rather than luke-jr's development branch: the testnet4 BLAKE2b
# activation height (150027) is compiled into CTestNet4Params, and it is only
# there in the bitcoinknots release-candidate tags. Regtest works from either
# tree, because there the height comes from -testactivationheight=blake2b@N, but
# testnet4 needs this one.
#
# This image can serve a mainnet node as of rc4, which is a change from every
# earlier pin. rc2 and rc3 refused ChainType::MAIN outright at init.cpp ("This
# release candidate only supports test networks"); rc4 removes that guard and
# has no -allow_mainnet_test_only, because BLAKE2b activated on mainnet at
# height 961640 on 2026-08-30 and this is the release that follows it.
#
# What it cannot serve, as of this pin, is the public test network. rc4 compiles
# testnet4's activation at 150308, and the live testnet4 chain activated at
# 150027 and has passed 150308 already, so the two are different chains.
# entrypoint.sh refuses testnet4 rather than letting it stall at 150026, which
# is what that mismatch looks like from the outside.

# Why the activation height and the headline are not build arguments: both are
# compiled into chainparams and checked by consensus, and both are re-cut by
# upstream at every release candidate. See UPDATING.md.
#
# Note also init.cpp:1097: blake2b_headline is mandatory on *every* chain, not
# just where BLAKE2b is scheduled. entrypoint.sh already requires it.
#
# That is true of this pin and stops being true at the next one. Upstream commit
# 5f91c0bb0f, on branch pow_hf_blake2b_params and in no tag as of 2026-09-01,
# hardcodes mainnet's headline into chainparams and demotes the option to a
# regtest-only one, dropping the mandatory-everywhere InitError with it. Nothing
# here has to change for that: the option stays registered on every chain, so
# passing it where it is now ignored is not an error, and the string this image
# forces on mainnet is byte-identical to the one that commit hardcodes. What DID
# have to change is regtest, where that commit makes the headline throw unless
# -testactivationheight=blake2b@<height> is set with it; see entrypoint.sh.
#
# There is no signed release for this tag. bitcoinknots.org publishes nothing
# past 29.4.knots20260508, and the RC tags have no GitHub release, so there are
# no artifacts and no detached signature. Building from source here trades the
# signed-release trust model for a pinned git commit, which is a real reduction
# in assurance and is stated in the README.
FROM debian:bookworm-slim AS build

ARG KNOTS_REPO=https://github.com/bitcoinknots/bitcoin.git
ARG KNOTS_REF=dc82be77dd741dfa63e1f816367b15364d55b051

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

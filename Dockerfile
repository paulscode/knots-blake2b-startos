# Bitcoin Knots with the BLAKE2b proof-of-work change.
#
# Pinned by commit, never by branch: a floating build would silently cross
# consensus revisions (PLAN section 8). The commit below is the tag
# v29.4.1.knots20260508rc3, recorded as a SHA because a release candidate's tag
# can be moved and a SHA cannot.
#
# Why this tag rather than luke-jr's development branch: the testnet4 BLAKE2b
# activation height (150027) is compiled into CTestNet4Params, and it is only
# there in the bitcoinknots release-candidate tags. Regtest works from either
# tree, because there the height comes from -testactivationheight=blake2b@N, but
# testnet4 needs this one.
#
# This image cannot serve a mainnet node, and that is upstream's choice, not
# ours: init.cpp:1079 refuses ChainType::MAIN outright ("This release candidate
# only supports test networks") unless -allow_mainnet_test_only is passed.
# Verified by running it. So the mainnet Knots forks stay on signed releases and
# this package stays on test networks; the two are not interchangeable.
#
# Note also init.cpp:1097: blake2b_headline is mandatory on *every* chain, not
# just where BLAKE2b is scheduled. entrypoint.sh already requires it.
#
# There is no signed release for this tag. bitcoinknots.org publishes nothing
# past 29.4.knots20260508, and the RC tags have no GitHub release, so there are
# no artifacts and no detached signature. Building from source here trades the
# signed-release trust model for a pinned git commit, which is a real reduction
# in assurance and is stated in the README.
FROM debian:bookworm-slim AS build

ARG KNOTS_REPO=https://github.com/bitcoinknots/bitcoin.git
ARG KNOTS_REF=afbe91c299e16519f03902939fdbda8af9bd527d

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

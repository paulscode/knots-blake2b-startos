# Updating the upstream version

Upstream is **built from source**, not a published image or a signed release tarball.
There is no BLAKE2b release to track: `bitcoinknots.org/files/29.x/` stops at
`29.4.knots20260508`, and the release-candidate tags have no GitHub release, so no
artifacts and no detached `SHA256SUMS.asc` exist. So "the upstream version" here is a
git commit, and the trust model is a pinned SHA rather than a signer quorum.

## Where the pin lives

**One place: the `KNOTS_REF` ARG default in [Dockerfile](Dockerfile).**

```dockerfile
ARG KNOTS_REPO=https://github.com/bitcoinknots/bitcoin.git
ARG KNOTS_REF=afbe91c299e16519f03902939fdbda8af9bd527d
```

It is deliberately **not** a `buildArg` in `startos/manifest/index.ts`. It used to be
set in both, they drifted, and every StartOS build fetched a commit the Dockerfile had
already moved off. Do not reintroduce it there.

The commit is baked into the image at `/etc/knots-pinned-commit` and printed on every
start, so the running package always states what it actually built.

## Determining the upstream version

Tags carrying BLAKE2b live in `bitcoinknots/bitcoin`. Pin by the tag's commit SHA, not
the tag name: a release candidate's tag can be moved, and a floating build would
silently cross consensus revisions between package versions.

```bash
git ls-remote --tags https://github.com/bitcoinknots/bitcoin.git 'v29.*knots*'
# then resolve the one you want to a SHA
git rev-parse v29.4.1.knots20260508rc3^{commit}
```

Choosing a tag is a consensus decision, not a routine bump. What matters:

- **Which chains have `Blake2bHeight` set.** `git grep -n Blake2bHeight -- src/kernel/chainparams.cpp`
  on the candidate tag. The testnet4 activation (150027, in `CTestNet4Params`) exists
  only in the release-candidate tags, not in `luke-jr/bitcoin`'s `pow_hf_blake2b`
  branch. Repinning to a tree without it silently turns a testnet4 node into an
  ordinary testnet4 node that will fork at 150027.
- **What the activation height and headline now are.** Both change with every release
  candidate, and neither is derivable from the other. rc3's `chainparams.cpp` says so
  outright: the flag day is "set at release cut". Observed so far:

  | tag | testnet4 `Blake2bHeight` | headline |
  |---|---|---|
  | `...rc1` | | `RC1` |
  | `...rc2` | 149537 | `Totoro` |
  | `...rc3` | 150027 | `Catbus` |

  Two RCs with different heights are **incompatible chains**, not two views of one: an
  rc2 node enforces BLAKE2b from 149537 and so rejects the ordinary SHA256d blocks an
  rc3 chain still carries there. Repinning without moving `testnet4ActivationHeight`
  and `testnet4Headline` in `startos/utils.ts` gives a node that cannot follow the live
  chain at all.

  The height is in the tag's `CTestNet4Params`. The headline is **not in the source** and
  cannot be read from it: it is whatever the miners committed to. Take it from the
  activation block's coinbase, which is a short push immediately after the 3-byte BIP34
  height push:

  ```bash
  H=$(curl -s https://mempool.guide/testnet4/api/block-height/<activation-height>)
  curl -s "https://mempool.guide/testnet4/api/block/$H/txs/0" \
    | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['vin'][0]['scriptsig'])"
  ```

  The same command confirms the height: fetch a candidate height's header and check
  whether it is 80 bytes or 164.

- **Whether the configure flags changed.** `RDTS_CONSENT` is required by
  `luke-jr/bitcoin` and does not exist in the RC tags. Passing an unknown `-D` is only
  a cmake warning, so this fails quietly in the direction that matters less; omitting a
  required one fails the build loudly.
- **Whether the RPC shape changed.** rc3 renamed `getdeploymentinfo`'s top-level `hardfork`
  key to `blake2b` (`src/rpc/blockchain.cpp`, the `deploymentinfo.pushKV` call). The contents
  were unchanged. Nothing failed to compile and nothing warned; the Chain health check simply
  stopped finding the key and would have reported "not running the fork" on every start, which
  is a confident wrong answer rather than a crash. It now reads either key. Diff the RPC
  results the package parses, not just consensus code:

  ```bash
  git diff <old-tag> <new-tag> -- src/rpc/blockchain.cpp | grep -E '^[-+].*pushKV'
  ```

  Then check the built binary rather than the source, which is how this one was caught:

  ```bash
  docker run --rm --entrypoint sh <image> -c \
    'bitcoind -datadir=/tmp/d -testnet4 -blake2b_headline=<headline> -connect=0 -daemon \
       -rpcuser=u -rpcpassword=p; sleep 5; \
     bitcoin-cli -datadir=/tmp/d -testnet4 -rpcuser=u -rpcpassword=p getdeploymentinfo'
  ```

- **Whether the init guards changed.** In rc3, `src/init.cpp:1079` refuses mainnet and
  `src/init.cpp:1097` requires `blake2b_headline` on every chain. Both shape what the
  package must set.

## Applying the bump

1. Edit `KNOTS_REF` (and `KNOTS_REPO` if the tag moved repos) in `Dockerfile`.
2. Update the Upstream section of [README.md](README.md) with the new tag and SHA, and
   revisit its claims about which chains are available.
3. Bump `startos/versions/current.ts` and write release notes naming the tag.
4. Rebuild and re-verify (below). A consensus revision is not a bump you take on trust.

## Verifying after a bump

Build the image and check the artifact reports what you pinned:

```bash
docker build -t knots-blake2b:check .
docker run --rm --entrypoint sh knots-blake2b:check \
  -c 'cat /etc/knots-pinned-commit; bitcoind -version | head -1'
```

Then run the package's own entrypoint on regtest and confirm the header format changes
at the activation height. This is the flow that catches a tree where BLAKE2b is absent
or differently gated:

```bash
docker run -d --name bumpcheck \
  -e BLAKE2B_HEADLINE="bump check" -e CHAIN=regtest \
  -e BLAKE2B_ACTIVATION_HEIGHT=20 -e RPC_USER=lab -e RPC_PASSWORD=lab \
  knots-blake2b:check
cli() { docker exec bumpcheck bitcoin-cli -regtest -datadir=/data -rpcuser=lab -rpcpassword=lab "$@"; }
cli createwallet lab; cli generatetoaddress 26 "$(cli getnewaddress)"
for h in 19 20 26; do
  echo "$h: $(( $(cli getblockheader "$(cli getblockhash $h)" false | wc -c) / 2 )) bytes"
done   # expect 80, 164, 164
docker rm -f bumpcheck
```

Expected: 80 bytes at 19, 164 at 20 and after, and the headline string present in the
activation block's coinbase.

For a tag intended to serve testnet4, also confirm the height is compiled in, which
needs no sync:

```bash
# with connect=0 and blake2b_headline set, at genesis
bitcoin-cli -testnet4 getdeploymentinfo   # expect "blake2b": { "height": 150027 }
                                          # (the key was "hardfork" before rc3)
```

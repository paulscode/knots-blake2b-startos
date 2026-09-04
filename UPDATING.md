# Updating the upstream version

Upstream is **built from source**, not a published image or a signed release tarball.
There is no BLAKE2b release to track: `bitcoinknots.org/files/29.x/` stops at
`29.4.knots20260508`, and the BLAKE2b tags have no GitHub release, so no artifacts and
no detached `SHA256SUMS.asc` exist. So "the upstream version" here is a git commit, and
the trust model is a pinned SHA rather than a signer quorum.

## Where the pin lives

**One place: the `KNOTS_REF` ARG default in [Dockerfile](Dockerfile).**

```dockerfile
ARG KNOTS_REPO=https://github.com/bitcoinknots/bitcoin.git
ARG KNOTS_REF=8c85b1585dac23f964e2dd32045624de7f02aa58
```

It is deliberately **not** a `buildArg` in `startos/manifest/index.ts`. It used to be
set in both, they drifted, and every StartOS build fetched a commit the Dockerfile had
already moved off. Do not reintroduce it there.

The commit is baked into the image at `/etc/knots-pinned-commit` and printed on every
start, so the running package always states what it actually built.

## Determining the upstream version

Tags carrying BLAKE2b live in `bitcoinknots/bitcoin`. Pin by the tag's commit SHA, not
the tag name: a tag can be moved, and a floating build would silently cross consensus
revisions between package versions.

```bash
git ls-remote --tags https://github.com/bitcoinknots/bitcoin.git 'v29.*knots*'
# then resolve the one you want to a SHA
git rev-parse v29.4.1.knots20260508^{commit}
```

Choosing a tag is a consensus decision, not a routine bump. What matters:

- **Mainnet's `Blake2bHeight`, and that it is still 961640.**
  `git grep -n Blake2bHeight -- src/kernel/chainparams.cpp` on the candidate tag. A tag
  that moves it is a different chain, not a newer view of this one, and the `chain`
  health check will say so on the first start rather than letting the node stall
  quietly. `mainnetActivationHeight` in `startos/utils.ts` is the value it checks
  against; move both or neither.

- **That the mainnet headline is still compiled in.** As of the final release,
  `blake2b_headline` is a regtest-only option and mainnet's value
  (`8-30 NYPost Deride And Conquer`) is hardcoded in `CMainParams`. The entrypoint
  therefore does not write it at all. If a future tag demotes it back to a
  configurable option on mainnet, the entrypoint has to start writing it again, and
  getting it wrong rejects block 961640 and everything after with
  `AcceptBlock FAILED (bad-headline, Headline is wrong)`, which from the outside looks
  exactly like having no fork peers.

  ```bash
  git grep -n 'blake2b_headline\|Blake2bHeadline' -- src/init.cpp src/kernel/chainparams.cpp
  ```

- **Whether the configure flags changed.** `RDTS_CONSENT` is required by
  `luke-jr/bitcoin` and does not exist in the knots tags. Passing an unknown `-D` is
  only a cmake warning, so this fails quietly in the direction that matters less;
  omitting a required one fails the build loudly.

- **Whether the RPC shape changed.** rc3 renamed `getdeploymentinfo`'s top-level
  `hardfork` key to `blake2b` (`src/rpc/blockchain.cpp`, the `deploymentinfo.pushKV`
  call). The contents were unchanged. Nothing failed to compile and nothing warned; the
  Chain health check simply stopped finding the key and would have reported "not running
  the fork" on every start, which is a confident wrong answer rather than a crash. It
  now reads either key. Diff the RPC results the package parses, not just consensus
  code:

  ```bash
  git diff <old-tag> <new-tag> -- src/rpc/blockchain.cpp | grep -E '^[-+].*pushKV'
  ```

- **Whether the init guards changed.** The release-candidate tags refused
  `ChainType::MAIN` outright at `src/init.cpp`, and required `blake2b_headline` on every
  chain. Both were removed by rc4 and the final, and both would break this package if a
  tag reintroduced them.

- **Whether the service bits changed.** Peer discovery on this chain depends entirely on
  `NODE_BLAKE2B` being in `SeedsServiceFlags()`, because that is what makes the DNS seeds
  return fork nodes rather than the other chain's. `git grep -n SeedsServiceFlags`.

## Three packages import from this one

`electrs-pruned-startos`, `mempool-pruned-startos` and `datum-blake2b-startos` all declare

```json
"knots-blake2b-startos": "github:paulscode/knots-blake2b-startos#main"
```

and import from `startos/utils` and `startos/manifest`. The reference floats on `main`, so what
a given tree has is whatever npm last resolved, and a change here reaches them at their next
install rather than when it is made.

What they import is the interface surface: `rpcHostId`, `rpcPort`, `peerLocalHostId`,
`peerPortLocal`, `manifest`. Checked, not assumed:

```bash
grep -rn "knots-blake2b-startos" <pkg>/startos
```

So before releasing a change here, check which side of that line it falls on. Moving a
consensus constant is contained. Renaming an interface id or changing a port is not, and
will reach three packages silently at their next `npm install`, with no version bump to
signal it. In that case bump and rebuild them too.

**1.0.0:30 removed exports.** `chains`, `defaultChain`, `Chain`, `chainDataSubdir`,
`chainFromConf`, `headlineFor`, `defaultHeadline`, `defaultActivationHeight` and
`mainnetHeadline` are gone, and `chainFlag` became a constant rather than a function.
`datum-blake2b-startos` imported the first four and was updated in the same pass. Any
package still importing them will fail to typecheck, which is the right failure.

## Applying the bump

1. Edit `KNOTS_REF` (and `KNOTS_REPO` if the tag moved repos) in `Dockerfile`.
2. Update the Upstream section of [README.md](README.md) with the new tag and SHA.
3. Bump `startos/versions/current.ts` and write release notes naming the tag.
4. Rebuild and re-verify (below). A consensus revision is not a bump you take on trust.

## Verifying after a bump

Build the image and check the artifact reports what you pinned:

```bash
docker build -t knots-blake2b:check .
docker run --rm --entrypoint sh knots-blake2b:check \
  -c 'cat /etc/knots-pinned-commit; bitcoind -version | head -1'
```

Then confirm the header format actually changes at an activation height. This is the
flow that catches a tree where BLAKE2b is absent or differently gated, and it is done on
regtest because that is the only chain where the height is settable and reachable in
seconds.

**Note this bypasses the package's entrypoint deliberately.** The package runs mainnet
only and its entrypoint writes no chain selector, no headline and no activation height.
The binary inside the image still supports regtest, which is what makes this check
possible; call `bitcoind` directly rather than trying to persuade the entrypoint to do
it.

```bash
docker run -d --name bumpcheck --entrypoint bitcoind knots-blake2b:check \
  -datadir=/data -regtest -server -printtoconsole \
  -testactivationheight=blake2b@20 -blake2b_headline="bump check" \
  -connect=0 -rpcuser=lab -rpcpassword=lab -rpcbind=127.0.0.1 -rpcallowip=127.0.0.1
sleep 5
cli() { docker exec bumpcheck bitcoin-cli -regtest -datadir=/data -rpcuser=lab -rpcpassword=lab "$@"; }
cli createwallet lab; cli generatetoaddress 26 "$(cli getnewaddress)"
for h in 19 20 26; do
  echo "$h: $(( $(cli getblockheader "$(cli getblockhash $h)" false | wc -c) / 2 )) bytes"
done   # expect 80, 164, 164
docker rm -f bumpcheck
```

Expected: 80 bytes at 19, 164 at 20 and after, and the headline string present in the
activation block's coinbase. `-blake2b_headline` and `-testactivationheight=blake2b@N`
must be passed together: the option throws without the height as of this release.

Then confirm mainnet's schedule is what the package expects, which needs no sync:

```bash
docker run --rm --entrypoint sh knots-blake2b:check -c \
  'bitcoind -datadir=/tmp/d -chain=main -connect=0 -daemon -rpcuser=u -rpcpassword=p; sleep 5;
   bitcoin-cli -datadir=/tmp/d -chain=main -rpcuser=u -rpcpassword=p getdeploymentinfo' \
  | grep -A3 blake2b   # expect "height": 961640
```

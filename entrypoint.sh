#!/bin/bash
# Build bitcoin.conf from the environment, then run bitcoind in the foreground.
#
# RPC is bound to the container network only. It is never published to the host
# in the compose file, and must never be.
set -euo pipefail

DATADIR=/data
CONF="$DATADIR/bitcoin.conf"

# RPC auth: if no user/password is supplied, bitcoind generates a .cookie in the
# datadir and dependents read it. That is the pattern the official Datum package
# uses against the official Bitcoin package, and it means no RPC secret has to be
# generated, stored, or shared by us at all.
: "${BLAKE2B_HEADLINE:?BLAKE2B_HEADLINE is required, and must not be empty}"

if [ -z "${BLAKE2B_HEADLINE// /}" ]; then
    echo "FATAL: BLAKE2B_HEADLINE is empty. An empty headline satisfies the node's" >&2
    echo "       startup check but makes the consensus rule a no-op, because" >&2
    echo "       std::search with an empty needle always matches. Refusing." >&2
    exit 1
fi

# A settings file, when one is mounted, outranks the environment. StartOS has
# actions for this and passes the answers in as environment; Umbrel and plain
# Docker have no settings form at all, so the page the gateway serves writes here
# instead. Absent, nothing changes and the environment is the only source.
SETTINGS="${SETTINGS_FILE:-/config/settings.json}"
settings_get() {
    [ -s "$SETTINGS" ] || return 1
    # Two patterns because JSON has two shapes here and the page writes both: a
    # quoted string for `chain`, a bare number for `prune`. Matching only the
    # quoted form meant a numeric setting read as empty and was silently ignored.
    sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$SETTINGS" | head -1 | grep . && return 0
    sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p" "$SETTINGS" | head -1
}

# mainnet by default: the BLAKE2b chain is live there and following it is what
# this image is for. A settings file still outranks this, so an install that has
# already chosen a chain through the page keeps it across an image update.
CHAIN="${CHAIN:-mainnet}"
_chain_from_file="$(settings_get chain || true)"
if [ -n "${_chain_from_file:-}" ]; then
    CHAIN="$_chain_from_file"
    echo "knots-blake2b: chain from $SETTINGS"
fi

PRUNE="${PRUNE:-0}"
# Same precedence as the chain: a mounted settings file outranks the environment,
# because on Umbrel and plain Docker that file is the only interface a user has.
# 0 keeps the whole chain; anything else is a budget in MiB that bitcoind enforces
# itself. 1 is bitcoind's manual mode and is not offered anywhere: it reports the
# node as pruned while never discarding anything, so it grows without bound.
_prune_from_file="$(settings_get prune || true)"
if [ -n "${_prune_from_file:-}" ]; then
    PRUNE="$_prune_from_file"
    echo "knots-blake2b: prune from $SETTINGS"
fi
ACTIVATION_HEIGHT="${BLAKE2B_ACTIVATION_HEIGHT:-}"
# Space-separated host:port entries to dial in addition to the chain's own seeds.
ADDNODES="${ADDNODES:-}"

# testnet4 needs two things that are not the operator's to choose, so they are
# not asked for. The headline is consensus: validation.cpp checks at the
# activation height that the configured string appears in that block's coinbase,
# and testnet4's block 150027 carries `Catbus`, so any other value rejects it and
# everything after. The peers exist because testnet4's DNS seeds return ordinary
# testnet4 nodes, which serve valid blocks up to 150026 and nothing after, so a
# node with only them stalls one block below the fork looking healthy.
TESTNET4_HEADLINE='Catbus'
TESTNET4_SEEDS='82.67.102.15:48333 178.118.234.189:48333 64.177.11.149:48333 86.8.92.221:48333 136.36.150.88:48333 172.117.233.59:48333 184.179.145.52:48333 207.81.196.105:48333'
if [ "$CHAIN" = "testnet4" ]; then
    if [ "${BLAKE2B_HEADLINE}" != "$TESTNET4_HEADLINE" ]; then
        echo "knots-blake2b: testnet4 requires the headline '$TESTNET4_HEADLINE'; using it"
        BLAKE2B_HEADLINE="$TESTNET4_HEADLINE"
    fi
    ADDNODES="$TESTNET4_SEEDS ${ADDNODES}"
fi

# Mainnet is consensus in the same way, and for the same reason: block 961640's
# coinbase carries this string, and validation.cpp checks it there. Get it wrong
# and the node rejects 961640 and everything after.
#
# No peer list here, unlike testnet4, and that is not an oversight. net.cpp:2418
# queries every DNS seed as `x<SeedsServiceFlags()>.<seed>`, which on this build
# is x10000009: NODE_NETWORK | NODE_WITNESS | NODE_BLAKE2B. Two of mainnet's
# seeds answer that prefix with fork nodes. Measured on 2026-08-30: all ten
# addresses they returned were on the BLAKE2b chain.
#
# Do not be tempted to seed from gossip instead. Both chains share magic bytes
# and port 8333, so one round of getaddr yielded 7349 candidates of which a
# 60-peer sample had none on the fork. The service-bit filter is the only thing
# that separates them.
MAINNET_HEADLINE='8-30 NYPost Deride And Conquer'
if [ "$CHAIN" = "mainnet" ]; then
    if [ "${BLAKE2B_HEADLINE}" != "$MAINNET_HEADLINE" ]; then
        echo "knots-blake2b: mainnet requires the headline '$MAINNET_HEADLINE'; using it"
        BLAKE2B_HEADLINE="$MAINNET_HEADLINE"
    fi
fi

case "$CHAIN" in
    regtest|mainnet) ;;
    main)
        CHAIN=mainnet ;;
    testnet4)
        # rc4 compiles testnet4's activation at 150308. The live testnet4 chain
        # forked at 150027 and is well past 150308 already, so this build expects
        # an ordinary block where that chain has a BLAKE2b one and will stop at
        # 150026. Refusing is better than syncing to a halt and looking like a
        # peer problem, which is exactly what that failure looks like.
        echo "FATAL: this build cannot follow the public test network as it stands." >&2
        echo "       It is built from v29.4.1.knots20260508rc4, which activates" >&2
        echo "       BLAKE2b on testnet4 at height 150308. The live testnet4 chain" >&2
        echo "       activated at 150027 and has passed 150308, so this build" >&2
        echo "       rejects it and would stall at 150026." >&2
        echo "       Use the private test chain, or mainnet, until that network" >&2
        echo "       restarts on rc4." >&2
        exit 1 ;;
    *)
        echo "FATAL: unsupported CHAIN='$CHAIN'. Use regtest or mainnet." >&2
        exit 1 ;;
esac

# bitcoind's config section for mainnet is `[main]`; for the others it is the
# chain name itself.
if [ "$CHAIN" = "mainnet" ]; then
    CONF_SECTION=main
else
    CONF_SECTION="$CHAIN"
fi

{
    echo "# generated by entrypoint, do not edit"
    # Mainnet is bitcoind's default and has no selector option: there is no
    # `mainnet=1`, and writing one is a startup error. Its config section is
    # `[main]`, not `[mainnet]`, so the section name is derived separately below.
    [ "$CHAIN" != "mainnet" ] && echo "${CHAIN}=1"
    echo "server=1"
    echo "printtoconsole=1"
    [ -n "${RPC_USER:-}" ] && echo "rpcuser=${RPC_USER}"
    [ -n "${RPC_PASSWORD:-}" ] && echo "rpcpassword=${RPC_PASSWORD}"
    echo "blake2b_headline=${BLAKE2B_HEADLINE}"
    [ "$PRUNE" != "0" ] && echo "prune=${PRUNE}"
    # Regtest only: fastprune shrinks block files so a short chain can actually
    # be pruned. On testnet4 it would just produce a great many tiny files.
    [ "$CHAIN" = "regtest" ] && [ "${FASTPRUNE:-0}" != "0" ] && echo "fastprune=1"
    # A fee of last resort for a chain where fee estimation has no history to
    # work from. On mainnet it does, and a hardcoded fallback there would be a
    # wallet setting this package has no business making.
    [ "$CHAIN" != "mainnet" ] && echo "fallbackfee=0.0001"
    echo
    echo "[${CONF_SECTION}]"
    # When pruning, btc-rpc-proxy takes 18443, the port dependents resolve, and
    # bitcoind steps aside to a loopback-only port behind it. The proxy answers
    # for blocks this node has dropped by fetching them from peers, so a
    # dependent sees a node that behaves as though it were archival. Unpruned,
    # there is nothing to fetch and bitcoind holds 18443 itself.
    echo "rpcbind=${RPC_BIND:-0.0.0.0}"
    echo "rpcallowip=${RPC_ALLOW_IP:-172.16.0.0/12}"
    # The internal ports stay the same on every chain, rather than following
    # each chain's default. They are this package's contract with dependents,
    # and StartOS gives every package its own bridge address, so there is
    # nothing to collide with. A dependent should not have to re-read a port
    # because the operator switched chains.
    echo "rpcport=${RPC_PORT:-18443}"
    # Two p2p listeners. `bind` is the ordinary one, shared with anonymous
    # inbound peers. `whitebind` grants noban + download to whatever arrives on
    # it, and StartOS keeps that binding off the LAN, so it is reachable only by
    # other services on the bridge. A dependent pulling historical blocks needs
    # the second: on the first it is subject to inbound eviction, and on a pruned
    # node to NODE_NETWORK_LIMITED, which disconnects it for asking about a block
    # more than 288 deep.
    #
    # Both are explicit because naming either one disables bitcoind's default
    # listener, so omitting `bind` here would leave the node with no ordinary
    # p2p port at all.
    echo "bind=0.0.0.0:18444"
    echo "whitebind=0.0.0.0:18445"
    # Regtest only. `-testactivationheight` is read by CRegTestParams and nowhere
    # else, so on testnet4 bitcoind accepts it, logs it, and ignores it: the
    # height stays the compiled-in 150027. Writing it there would be config that
    # looks effective and is not, so it is not written.
    if [ "$CHAIN" = "regtest" ] && [ -n "$ACTIVATION_HEIGHT" ]; then
        echo "testactivationheight=blake2b@${ACTIVATION_HEIGHT}"
    fi
    for node in $ADDNODES; do
        echo "addnode=${node}"
    done
    [ -n "${BLOCKNOTIFY_URL:-}" ] && echo "blocknotify=wget -q -T 2 -O /dev/null ${BLOCKNOTIFY_URL}"
} > "$CONF"

echo "knots-blake2b: pinned commit $(cat /etc/knots-pinned-commit)"
case "$CHAIN" in
    regtest)  activation_note="${ACTIVATION_HEIGHT:-none}" ;;
    mainnet)  activation_note="961640 (compiled in, not configurable)" ;;
    *)        activation_note="compiled in, not configurable" ;;
esac
echo "knots-blake2b: chain=${CHAIN} prune=${PRUNE} activation=${activation_note}"
echo "knots-blake2b: addnodes=${ADDNODES:-none}"

# Watch the settings file, and stop if it changes so the container's restart
# policy brings us back reading the new one. Nothing here talks to Docker: the
# alternative was handing a web page the Docker socket, which is root on the host
# in exchange for saving a click. `exec` below replaces this shell with bitcoind
# as PID 1, so signalling PID 1 is signalling bitcoind, and it shuts down cleanly.

# Not `exec`. A process running as PID 1 does not get the default action for a
# signal it has no handler for, so the kernel discards it. bitcoind installs a
# SIGTERM handler and would have been fine; datum_gateway does not, and a settings
# change printed "restarting to apply" while the service carried on running. So
# the shell stays PID 1, the service is its child, and signalling the child works
# the way signalling anything else works.
bitcoind -datadir="$DATADIR" "$@" &
APP_PID=$!

# Forward what `docker stop` and StartOS send, so staying PID 1 does not turn a
# normal shutdown into a ten-second wait and a kill.
trap 'kill -TERM "$APP_PID" 2>/dev/null || true' TERM INT

# Started unconditionally, and it hashes "absent" as a state of its own. Guarding
# on the file existing meant a settings file created *after* boot was never
# noticed, which is exactly what happens the first time somebody uses the page:
# there is nothing to watch until they press save, and by then the watcher would
# never have been started.
(
    _hash() { [ -s "$SETTINGS" ] && sha256sum "$SETTINGS" | cut -d' ' -f1 || echo none; }
    _seen="$(_hash)"
    while sleep 5; do
        _now="$(_hash)"
        if [ "$_now" != "$_seen" ]; then
            echo "knots-blake2b: settings changed, restarting to apply"
            kill -TERM "$APP_PID" 2>/dev/null || true
            exit 0
        fi
    done
) &

# Exits when the service does, whether that is a crash, a stop, or the watcher
# above deciding the settings changed. Either way the restart policy decides what
# happens next.
#
# The loop is the point, and one `wait` is not enough. A trapped signal makes
# `wait` return immediately with a status above 128, *without* reaping the child:
# the trap above has only asked the service to stop, and it is still running. If
# the script ended there, PID 1 would exit while the service was still shutting
# down, and the container would take it with it. For bitcoind that means the
# chainstate is never flushed, so a stop during a long sync throws the sync away
# and it starts over from the last flush, which during an initial sync is
# nothing. Measured: stopping at height 84900 mid-IBD came back at height 327.
#
# So wait again until the child is genuinely gone, and exit with its status
# rather than the signal's.
# `|| rc=$?` rather than a bare `wait`, and that is the whole fix. `set -e` is on
# (line 6), and an interrupted `wait` returns 128+signum, so a bare `wait` ends
# the script the instant the signal arrives, before anything can read its status.
# That is what used to happen: the trap asked the service to stop, `set -e` then
# killed PID 1 five milliseconds later, and the container took the service down
# mid-shutdown. A command on the left of `||` is exempt from `set -e`.
rc=0
wait "$APP_PID" || rc=$?
while [ "$rc" -gt 128 ] && kill -0 "$APP_PID" 2>/dev/null; do
    rc=0
    wait "$APP_PID" || rc=$?
done
exit "$rc"


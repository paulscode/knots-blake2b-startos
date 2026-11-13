import type { healthFns } from '@start9labs/start-sdk'

type Result = healthFns.HealthCheckResult

/**
 * How long one run of a health check may take before it is treated as
 * unanswered. A healthy node answers these RPCs in milliseconds and a starting
 * one answers at once with its warmup step, so a minute only ever runs out on
 * a call that is not coming back. It is not a limit on the node: nothing is
 * killed, and bitcoind's own shutdown keeps its separate 5 minutes
 * (`sigtermTimeout`).
 */
export const CHECK_TIMEOUT_MS = 60_000

/**
 * How many runs in a row may go unanswered while the check keeps showing its
 * last real result. Anything but `success` pauses every daemon that
 * `requires` the check, so one slow answer must not stop the proxy; a check
 * that stays unanswered must still say so.
 */
export const STALE_REPEATS = 2

/**
 * Wrap a health check's `fn` so a run that never returns cannot wedge it.
 *
 * Why this exists: start-sdk's `HealthDaemon.runHealthCheckLoop` awaits `fn()`
 * with no limit and only looks at its abort signal once `fn()` returns. When a
 * service stops, `Daemons.stopEntries` terms entries one by one in dependency
 * order, every check before the `node` daemon it requires, and each term waits
 * for that loop to end. So one `fn()` that never returns freezes its check at
 * "Starting" for the life of the service, and later blocks every stop, update
 * and restart before bitcoind is ever signalled: the proxy and i2pd go down,
 * the node keeps running, an update sits at "Installing 80%" and the OS Restart
 * hangs (knots-blake2b-startos#4; the same seen on a Knots SHA256 node). It can
 * happen even though `SubContainer.exec` has a 30 s timeout of its own: that
 * timer is armed only after `exec` has waited, without a limit, for its file
 * mounts to sync.
 *
 * At most one run is outstanding. If the previous one is still pending when
 * the check fires again, this waits on that run again rather than starting
 * another, so a call that never returns costs one pending promise, not one a
 * minute.
 */
export function bounded(
  fn: () => Result | Promise<Result>,
  onTimeout: () => Result,
  ms: number = CHECK_TIMEOUT_MS,
): () => Promise<Result> {
  let inFlight: Promise<Result> | null = null
  let last: Result | null = null
  let misses = 0

  return async () => {
    if (!inFlight) {
      const run = Promise.resolve()
        .then(fn)
        .finally(() => {
          if (inFlight === run) inFlight = null
        })
      inFlight = run
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    const timedOut = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), ms)
    })
    try {
      // The race also handles the run, so if it is abandoned here and rejects
      // later there is no unhandled rejection to take down the runtime.
      const res = await Promise.race([inFlight, timedOut])
      if (res !== null) {
        misses = 0
        last = res
        return res
      }
    } catch (e) {
      // A thrown fn is the SDK's to report, exactly as before.
      misses = 0
      last = null
      throw e
    } finally {
      clearTimeout(timer)
    }

    misses += 1
    console.warn(
      `health check run unanswered after ${ms / 1000}s (${misses} in a row)`,
    )
    if (last && misses <= STALE_REPEATS) return last
    return onTimeout()
  }
}

// Run with: npm test  (node --experimental-strip-types --test test/)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bounded, STALE_REPEATS } from '../startos/boundedCheck.ts'

type R = {
  result: 'success' | 'starting'
  message: string | null
}

const MS = 40
const ok = (message: string): R => ({ result: 'success', message })
const unanswered = (): R => ({ result: 'starting', message: 'unanswered' })
const never = () => new Promise<R>(() => {})
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const within = <T>(p: Promise<T>, ms: number) =>
  Promise.race([
    p.then(() => 'returned' as const),
    sleep(ms).then(() => 'still waiting' as const),
  ])

test('a run that answers in time is returned as is', async () => {
  const check = bounded(async () => ok('fine'), unanswered, MS)
  assert.deepEqual(await check(), ok('fine'))
})

test('a run that never answers reads as unanswered, not forever pending', async () => {
  const check = bounded(never as any, unanswered, MS)
  assert.equal(await within(check(), MS * 5), 'returned')
  assert.deepEqual(await check(), unanswered())
})

test('after a real result, a few unanswered runs repeat it before saying so', async () => {
  let hang = false
  const check = bounded(
    () => (hang ? never() : Promise.resolve(ok('synced'))) as any,
    unanswered,
    MS,
  )
  assert.deepEqual(await check(), ok('synced'))
  hang = true
  for (let i = 0; i < STALE_REPEATS; i++) {
    assert.deepEqual(await check(), ok('synced'), `repeat ${i + 1}`)
  }
  assert.deepEqual(await check(), unanswered())
})

test('an answer in between starts the count again', async () => {
  // Each run is a promise the test settles by hand.
  const runs: ((r: R) => void)[] = []
  const check = bounded(
    () => new Promise<R>((resolve) => runs.push(resolve)) as any,
    unanswered,
    MS,
  )
  const first = check()
  await sleep(0) // the run starts on a microtask
  runs[0](ok('synced'))
  assert.deepEqual(await first, ok('synced'))

  // Run 2 hangs through as many misses as the repeat allows.
  for (let i = 0; i < STALE_REPEATS; i++) {
    assert.deepEqual(await check(), ok('synced'))
  }
  // It answers at last, which must reset the count of misses.
  runs[1](ok('synced again'))
  assert.deepEqual(await check(), ok('synced again'))

  // So one fresh miss is a repeat again, not "unanswered".
  assert.deepEqual(await check(), ok('synced again'))
  assert.equal(runs.length, 3)
})

test('a pending run is waited on again, not started again', async () => {
  let started = 0
  const check = bounded(
    () => {
      started += 1
      return never() as any
    },
    unanswered,
    MS,
  )
  await check()
  await check()
  await check()
  assert.equal(started, 1)
})

test('a run that answers late is picked up by the next call and resets the count', async () => {
  let release!: (r: R) => void
  let calls = 0
  const check = bounded(
    () => {
      calls += 1
      return (
        calls === 1
          ? new Promise<R>((r) => (release = r))
          : Promise.resolve(ok('later'))
      ) as any
    },
    unanswered,
    MS,
  )
  assert.deepEqual(await check(), unanswered())
  release(ok('late'))
  assert.deepEqual(await check(), ok('late'))
  assert.deepEqual(await check(), ok('later'))
  assert.equal(calls, 2)
})

test('an error from the check still reaches the SDK', async () => {
  const check = bounded(
    async () => {
      throw new Error('boom')
    },
    unanswered,
    MS,
  )
  await assert.rejects(check(), /boom/)
})

test('an abandoned run that rejects later is not an unhandled rejection', async () => {
  const seen: unknown[] = []
  const onUnhandled = (e: unknown) => seen.push(e)
  process.on('unhandledRejection', onUnhandled)
  try {
    let reject!: (e: Error) => void
    const check = bounded(
      () => new Promise<R>((_, r) => (reject = r)) as any,
      unanswered,
      MS,
    )
    assert.deepEqual(await check(), unanswered())
    reject(new Error('late failure'))
    await sleep(MS)
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
  assert.deepEqual(seen, [])
})

/**
 * The shape of start-sdk's HealthDaemon.runHealthCheckLoop and stopSession:
 * fn() is awaited with no limit and the abort is only looked at after it
 * returns, and a stop aborts and then waits for the loop to end. Every check
 * that requires the node is stopped this way before the node is signalled.
 */
function sdkLoop(fn: () => Promise<R>) {
  const abort = new AbortController()
  const done = (async () => {
    while (!abort.signal.aborted) {
      await fn()
      if (abort.signal.aborted) break
      await sleep(5)
    }
  })()
  return {
    stop: async () => {
      abort.abort()
      await done
    },
  }
}

test('model: without the bound, a check stuck in one run blocks its stop', async () => {
  const loop = sdkLoop(never)
  await sleep(10)
  assert.equal(await within(loop.stop(), MS * 5), 'still waiting')
})

test('model: with the bound, the same stop finishes', async () => {
  const loop = sdkLoop(bounded(never as any, unanswered, MS) as any)
  await sleep(10)
  assert.equal(await within(loop.stop(), MS * 5), 'returned')
})

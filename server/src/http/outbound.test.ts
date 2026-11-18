import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTimeout, outboundSignal, withTimeout } from './outbound.ts';

test('the stop signal fires, and a referenced timer keeps the wait alive', async () => {
  const signal = outboundSignal(20);
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 200);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });
  assert.equal(signal.aborted, true);
});

test('a call that does not finish is stopped, and named as a timeout', async () => {
  await assert.rejects(withTimeout(new Promise(() => undefined), 20), (error: Error) => {
    assert.equal(error.name, 'UpstreamTimeout');
    assert.equal(isTimeout(error), true);
    return true;
  });
});

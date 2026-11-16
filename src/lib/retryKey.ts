import { useRef } from 'react';
import * as Crypto from 'expo-crypto';

export type RetryKey = { request: string; key: string };

/**
 * The same request keeps the same key; a changed request gets a new one. On a bad connection an
 * order can reach the server while the reply is lost. The guest taps again, and the server sees
 * the same key and returns the first order instead of making a second (BUILD.md section 11).
 */
export function nextRetryKey(prev: RetryKey | null, request: string, make: () => string): RetryKey {
  return prev?.request === request ? prev : { request, key: make() };
}

/** keyFor(request) gives the idempotency key for this request, reused on every retry. */
export function useRetryKey(): (request: unknown) => string {
  const last = useRef<RetryKey | null>(null);
  return (request) => {
    last.current = nextRetryKey(last.current, JSON.stringify(request), Crypto.randomUUID);
    return last.current.key;
  };
}

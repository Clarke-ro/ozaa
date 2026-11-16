import { nextRetryKey } from './retryKey';

let n = 0;
const make = () => `key-${++n}`;

describe('nextRetryKey', () => {
  beforeEach(() => {
    n = 0;
  });

  it('makes a key for the first try', () => {
    expect(nextRetryKey(null, 'cart-a', make)).toEqual({ request: 'cart-a', key: 'key-1' });
  });

  it('reuses the key when the same request is sent again', () => {
    const first = nextRetryKey(null, 'cart-a', make);
    expect(nextRetryKey(first, 'cart-a', make)).toBe(first);
  });

  it('makes a new key once the request changes', () => {
    const first = nextRetryKey(null, 'cart-a', make);
    expect(nextRetryKey(first, 'cart-b', make)).toEqual({ request: 'cart-b', key: 'key-2' });
  });
});

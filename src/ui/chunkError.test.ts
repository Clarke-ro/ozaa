import { isChunkLoadError, shouldReloadForUpdate } from './chunkError';

describe('isChunkLoadError', () => {
  it("spots a page's code file that failed to download", () => {
    const e = new Error('Loading module http://x/_expo/static/js/web/orders-abc.js failed.');
    e.name = 'AsyncRequireError';
    expect(isChunkLoadError(e)).toBe(true);
    expect(isChunkLoadError(new Error('Loading module https://x/menu.js failed.'))).toBe(true);
  });

  it('leaves real bugs alone', () => {
    expect(isChunkLoadError(new TypeError('x is undefined'))).toBe(false);
  });
});

describe('shouldReloadForUpdate', () => {
  it('reloads once, then not again within a minute, so a broken deploy cannot loop', () => {
    expect(shouldReloadForUpdate(null, 1_000_000)).toBe(true);
    expect(shouldReloadForUpdate(1_000_000 - 30_000, 1_000_000)).toBe(false);
    expect(shouldReloadForUpdate(1_000_000 - 61_000, 1_000_000)).toBe(true);
  });
});

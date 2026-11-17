import { nfcWriter, writeNfcTag } from './nfc';

/** A stand-in for Chrome's NDEFReader that records what was written. */
function fakeReader(
  outcome: 'ok' | 'NotAllowedError' | 'AbortError' | 'NotSupportedError' | 'boom',
) {
  const written: unknown[] = [];
  class Reader {
    async write(message: unknown, options?: { signal?: AbortSignal }) {
      written.push({ message, signal: options?.signal });
      if (outcome === 'ok') return;
      const error = new Error(outcome);
      error.name = outcome === 'boom' ? 'Error' : outcome;
      throw error;
    }
  }
  return { Reader, written };
}

describe('writeNfcTag', () => {
  it('writes the table link as a single URL record', async () => {
    const { Reader, written } = fakeReader('ok');
    const result = await writeNfcTag('https://cravins-app.vercel.app/mamas-kitchen/t/12', {
      Reader,
    });
    expect(result).toBe('written');
    expect(written[0]).toMatchObject({
      message: {
        records: [{ recordType: 'url', data: 'https://cravins-app.vercel.app/mamas-kitchen/t/12' }],
      },
    });
  });

  it('says why a write failed', async () => {
    expect(await writeNfcTag('https://x.test/a/t/1', fakeReader('NotAllowedError'))).toBe(
      'not_allowed',
    );
    expect(await writeNfcTag('https://x.test/a/t/1', fakeReader('AbortError'))).toBe('cancelled');
    expect(await writeNfcTag('https://x.test/a/t/1', fakeReader('NotSupportedError'))).toBe(
      'unsupported',
    );
    expect(await writeNfcTag('https://x.test/a/t/1', fakeReader('boom'))).toBe('failed');
  });

  it('is unsupported without a reader, and passes the cancel signal through', async () => {
    expect(await writeNfcTag('https://x.test/a/t/1', { Reader: undefined })).toBe('unsupported');
    const { Reader, written } = fakeReader('ok');
    const stop = new AbortController();
    await writeNfcTag('https://x.test/a/t/1', { Reader, signal: stop.signal });
    expect(written[0]).toMatchObject({ signal: stop.signal });
  });
});

describe('nfcWriter', () => {
  it('finds NDEFReader on the page, or nothing', () => {
    class NDEFReader {}
    expect(nfcWriter({ NDEFReader })).toBe(NDEFReader);
    expect(nfcWriter({})).toBeUndefined();
    expect(nfcWriter(undefined)).toBeUndefined();
  });
});

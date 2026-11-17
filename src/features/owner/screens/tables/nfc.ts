/**
 * Writing a table's link onto an NFC sticker, so a guest can tap their phone on the card instead
 * of scanning. The tag holds the same link as the QR code, so both open the same table page.
 *
 * Only Chrome on Android can write tags from a web page (Web NFC, `NDEFReader`). Safari has no
 * Web NFC, so on an iPhone or a computer the sheet shows the link to copy into an NFC app.
 * Reading needs nothing from us: iPhones (XS and newer) and Android phones open a URL tag by themselves.
 */

export type NfcResult = 'written' | 'cancelled' | 'not_allowed' | 'unsupported' | 'failed';

type NdefWriter = new () => {
  write: (
    message: { records: { recordType: 'url'; data: string }[] },
    options?: { signal?: AbortSignal },
  ) => Promise<void>;
};

/** Chrome's NDEFReader if this page has one. `scope` is `window` in the app; tests pass their own. */
export function nfcWriter(scope: object | undefined): NdefWriter | undefined {
  if (!scope || !('NDEFReader' in scope)) return undefined;
  return (scope as { NDEFReader: NdefWriter }).NDEFReader;
}

export const canWriteNfc = () =>
  Boolean(nfcWriter(typeof window === 'undefined' ? undefined : window));

/**
 * Waits for a tag and writes the link as one URL record. Resolves when the tag is written, or
 * with the reason it wasn't: the person said no to NFC, cancelled, or the phone can't write tags.
 */
export async function writeNfcTag(
  url: string,
  { Reader, signal }: { Reader: unknown; signal?: AbortSignal },
): Promise<NfcResult> {
  if (typeof Reader !== 'function') return 'unsupported';
  try {
    const reader = new (Reader as NdefWriter)();
    await reader.write({ records: [{ recordType: 'url', data: url }] }, { signal });
    return 'written';
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'AbortError') return 'cancelled';
    if (name === 'NotAllowedError') return 'not_allowed';
    if (name === 'NotSupportedError') return 'unsupported';
    return 'failed';
  }
}

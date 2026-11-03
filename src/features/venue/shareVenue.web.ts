function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export async function shareVenueLink(
  url: string,
  title: string,
): Promise<'shared' | 'copied' | 'dismissed'> {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  if (nav && typeof nav.share === 'function') {
    try {
      await nav.share({ title, url });
      return 'shared';
    } catch (error) {
      if (isAbort(error)) return 'dismissed';
    }
  }
  try {
    await nav?.clipboard?.writeText(url);
    return 'copied';
  } catch {
    return 'dismissed';
  }
}

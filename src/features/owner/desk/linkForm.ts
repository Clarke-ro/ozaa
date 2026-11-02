export type LinkInput = {
  title: string;
  url: string;
  hasSchedule: boolean;
  start: string;
  end: string;
};
export type LinkCheck =
  | { ok: true; url: string; startDate: string | null; endDate: string | null }
  | { ok: false; field: 'title' | 'url' | 'start' | 'end' };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Dates are whole days in UTC: a link starts at the beginning of its first day and ends at the end of its last.
function day(text: string, edge: 'start' | 'end'): string | null | undefined {
  const value = text.trim();
  if (!value) return null;
  if (!DAY.test(value)) return undefined;
  const date = new Date(`${value}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Checks the custom-link form. Only web links are allowed, so a guest tap can never run a script. */
export function checkLink(input: LinkInput): LinkCheck {
  if (!input.title.trim()) return { ok: false, field: 'title' };
  let url = input.url.trim();
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      !parsed.hostname.includes('.') ||
      /\s/.test(input.url.trim())
    ) {
      return { ok: false, field: 'url' };
    }
  } catch {
    return { ok: false, field: 'url' };
  }
  if (!input.hasSchedule) return { ok: true, url, startDate: null, endDate: null };
  const startDate = day(input.start, 'start');
  if (startDate === undefined) return { ok: false, field: 'start' };
  const endDate = day(input.end, 'end');
  if (endDate === undefined) return { ok: false, field: 'end' };
  if (startDate && endDate && endDate < startDate) return { ok: false, field: 'end' };
  return { ok: true, url, startDate, endDate };
}

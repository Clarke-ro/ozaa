export type LogValue = string | number | boolean | null | undefined;
export type LogEntry = { event: string } & Record<string, LogValue>;
export type Log = (entry: LogEntry) => void;

// A field with one of these words in its name never reaches a log, whatever it holds
// (AGENTS.md: no phones or tokens in logs; Ghana's Data Protection Act 843).
const PRIVATE_FIELD = /phone|email|secret|token|password|authorization|otp|pin|key|address|name/i;

// Second line of defence: personal data that slips into an ordinary field is blanked. The
// lookarounds stop a phone match inside a reference like pay_0241234567abc.
const SCRUB: [RegExp, string][] = [
  [/eyJ[\w-]+\.[\w-]+\.[\w-]*/g, '[token]'],
  [/Bearer\s+\S+/gi, '[token]'],
  [/\b(?:sk|pk)_(?:test|live)_\w+/g, '[key]'],
  [/[^\s@()]+@[^\s@()]+\.[^\s@()]+/g, '[email]'],
  [/(?<![\w+])(?:\+\d{3}[\s-]?|0)\d{2}[\s-]?\d{3}[\s-]?\d{4}(?!\w)/g, '[phone]'],
];

function scrub(text: string): string {
  return SCRUB.reduce((out, [pattern, label]) => out.replace(pattern, label), text);
}

/**
 * One JSON line per event: easy to read now, easy to ship to a log service later. Every server
 * log goes through here, so the privacy rules live in one place.
 */
export function createLog(
  write: (line: string) => void = (line) => console.log(line),
  now: () => number = Date.now,
): Log {
  return (entry) => {
    const safe: Record<string, LogValue> = { at: new Date(now()).toISOString() };
    for (const [field, value] of Object.entries(entry)) {
      if (field !== 'event' && PRIVATE_FIELD.test(field)) safe[field] = '[removed]';
      else safe[field] = typeof value === 'string' ? scrub(value) : value;
    }
    write(JSON.stringify(safe));
  };
}

/** First-time setup: four short steps, then a summary. The screen turns keys into words. */
export const STEPS = ['venue', 'tables', 'wifi', 'payments'] as const;
export type Step = (typeof STEPS)[number];

export type Footer = {
  back: boolean;
  /** A plain button that moves on without saving. Its copy key, or null for none. */
  skip: 'skip' | 'skipForNow' | null;
  /** The one filled button. `connect` opens Integrations; the others save and move on. */
  primary: 'next' | 'finish' | 'connect';
};

/**
 * The buttons under each step. Wi-Fi and online payments are optional, so they can be skipped.
 * Guests can always pay in person, so payments without Paystack offers Connect or "skip for
 * now"; with Paystack already connected there is nothing to decide and it just finishes.
 */
export function footerFor(step: Step, paystackConnected: boolean): Footer {
  const back = step !== 'venue';
  if (step === 'wifi') return { back, skip: 'skip', primary: 'next' };
  if (step === 'payments')
    return paystackConnected
      ? { back, skip: null, primary: 'finish' }
      : { back, skip: 'skipForNow', primary: 'connect' };
  return { back, skip: null, primary: 'next' };
}

export type SummaryRow =
  | { step: 'venue'; done: boolean; value: string | null }
  | { step: 'tables'; done: boolean; value: number }
  | { step: 'wifi'; done: boolean; value: string | null }
  | { step: 'payments'; done: true; value: 'online' | 'inPerson' };

/** What the owner set up, one row per step, for the "You're ready" screen. */
export function setupSummary(input: {
  venueName: string;
  tableCount: number;
  wifiName: string;
  paystack: boolean;
}): SummaryRow[] {
  const name = input.venueName.trim();
  const wifi = input.wifiName.trim();
  return [
    { step: 'venue', done: name.length > 0, value: name || null },
    { step: 'tables', done: input.tableCount > 0, value: input.tableCount },
    { step: 'wifi', done: wifi.length > 0, value: wifi || null },
    // In person always works, so this row is never "missing"; online pay is the extra.
    { step: 'payments', done: true, value: input.paystack ? 'online' : 'inPerson' },
  ];
}

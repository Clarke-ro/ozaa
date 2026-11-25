import type { Channel } from '@/lib/api/types';

/**
 * Plain rules for the Chowdeck card on Integrations (docs/connectors-plan.md, BUILD.md 5b.4).
 */

/** The price rule typed on the card: a whole percent from 0 to 100. Blank is the menu price. */
export function priceRuleFrom(text: string, step: number): Channel['priceRule'] | null {
  const trimmed = text.trim();
  if (trimmed === '')
    return { percent: 0, roundToPesewas: step as Channel['priceRule']['roundToPesewas'] };
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  const percent = Number(trimmed);
  if (percent > 100) return null;
  return { percent, roundToPesewas: step as Channel['priceRule']['roundToPesewas'] };
}

export type ChowdeckState =
  | { kind: 'not_connected' }
  | { kind: 'off' }
  | { kind: 'not_sent' }
  | { kind: 'sending' }
  | { kind: 'failed'; at: string | null }
  | { kind: 'sent'; at: string | null }
  /** Sent, but the menu changed after: publish again. */
  | { kind: 'changed'; at: string | null };

/** The one state the card's status words come from. `menuUpdatedAt` is the menu as it is now. */
export function chowdeckState(channel: Channel, menuUpdatedAt: string): ChowdeckState {
  if (!channel.chowdeck) return { kind: 'not_connected' };
  if (!channel.enabled) return { kind: 'off' };
  const { sync } = channel;
  if (sync.state === 'off') return { kind: 'not_sent' };
  if (sync.state === 'pending') return { kind: 'sending' };
  if (sync.state === 'failed') return { kind: 'failed', at: sync.at };
  const stale = !sync.menuUpdatedAt || Date.parse(sync.menuUpdatedAt) < Date.parse(menuUpdatedAt);
  return stale ? { kind: 'changed', at: sync.at } : { kind: 'sent', at: sync.at };
}

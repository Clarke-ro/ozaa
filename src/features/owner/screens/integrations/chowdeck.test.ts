import type { Channel } from '@/lib/api/types';
import { chowdeckState, priceRuleFrom } from './chowdeck';

const connection = {
  mode: 'test' as const,
  merchantReference: 'mamas-osu',
  secretKeyHint: '••••9876',
  webhookUrl: 'https://api.example.com/v1/webhooks/chowdeck',
  connectedAt: '2026-11-24T10:00:00.000Z',
};
const base: Channel = {
  kind: 'chowdeck',
  enabled: false,
  priceRule: { percent: 0, roundToPesewas: 1 },
  hiddenItemIds: [],
  sync: { state: 'off', at: null, menuUpdatedAt: null, problems: [] },
  chowdeck: null,
};
const MENU = '2026-11-24T12:00:00.000Z';

describe('priceRuleFrom', () => {
  test('a whole percent from 0 to 100, with the step', () => {
    expect(priceRuleFrom('20', 50)).toEqual({ percent: 20, roundToPesewas: 50 });
    expect(priceRuleFrom(' 0 ', 100)).toEqual({ percent: 0, roundToPesewas: 100 });
  });
  test('blank means the menu price', () => {
    expect(priceRuleFrom('', 50)).toEqual({ percent: 0, roundToPesewas: 50 });
  });
  test('anything else is refused', () => {
    for (const text of ['-5', '101', '12.5', 'abc']) expect(priceRuleFrom(text, 50)).toBeNull();
  });
});

describe('chowdeckState', () => {
  test('no keys: not connected', () => {
    expect(chowdeckState(base, MENU)).toEqual({ kind: 'not_connected' });
  });
  test('keys but switched off: off', () => {
    expect(chowdeckState({ ...base, chowdeck: connection }, MENU)).toEqual({ kind: 'off' });
  });
  test('on and never sent: needs a publish', () => {
    const on = { ...base, chowdeck: connection, enabled: true };
    expect(chowdeckState(on, MENU)).toEqual({ kind: 'not_sent' });
  });
  test('sending, failed, sent and up to date, or sent but the menu changed since', () => {
    const on = { ...base, chowdeck: connection, enabled: true };
    const at = '2026-11-24T13:00:00.000Z';
    expect(
      chowdeckState(
        { ...on, sync: { state: 'pending', at, menuUpdatedAt: null, problems: [] } },
        MENU,
      ),
    ).toEqual({ kind: 'sending' });
    expect(
      chowdeckState(
        { ...on, sync: { state: 'failed', at, menuUpdatedAt: null, problems: [] } },
        MENU,
      ),
    ).toEqual({ kind: 'failed', at });
    expect(
      chowdeckState(
        { ...on, sync: { state: 'synced', at, menuUpdatedAt: MENU, problems: [] } },
        MENU,
      ),
    ).toEqual({ kind: 'sent', at });
    expect(
      chowdeckState(
        {
          ...on,
          sync: { state: 'synced', at, menuUpdatedAt: '2026-11-24T11:00:00.000Z', problems: [] },
        },
        MENU,
      ),
    ).toEqual({ kind: 'changed', at });
  });
});

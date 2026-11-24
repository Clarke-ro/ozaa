import {
  channelList,
  checkChannelPatch,
  emptyChowdeck,
  orderChannel,
  startPublish,
  webhookUrlFor,
  type ChowdeckState,
} from './channels';

const connection = {
  mode: 'test' as const,
  merchantReference: 'mamas-osu',
  secretKeyHint: '••••1a2b',
  webhookUrl: 'https://api.example.com/webhooks/chowdeck',
  connectedAt: '2026-11-24T10:00:00.000Z',
};
const connected: ChowdeckState = { ...emptyChowdeck(), connection };

describe('channelList', () => {
  test('always table, online and chowdeck, in that order', () => {
    const list = channelList({ onlineEnabled: false, chowdeck: emptyChowdeck() });
    expect(list.map((c) => c.kind)).toEqual(['table', 'online', 'chowdeck']);
  });

  test('table and online are built in: same price, nothing hidden, always synced', () => {
    const [table, online] = channelList({ onlineEnabled: true, chowdeck: emptyChowdeck() });
    expect(table).toMatchObject({ enabled: true, priceRule: { percent: 0 }, hiddenItemIds: [] });
    expect(online!.enabled).toBe(true);
    expect(online!.sync.state).toBe('synced');
    expect(online!.chowdeck).toBeNull();
  });

  test('online follows the Online ordering switch', () => {
    const [, online] = channelList({ onlineEnabled: false, chowdeck: emptyChowdeck() });
    expect(online!.enabled).toBe(false);
  });

  test('a new chowdeck channel is off, never sent and has no keys', () => {
    const chowdeck = channelList({ onlineEnabled: true, chowdeck: emptyChowdeck() })[2]!;
    expect(chowdeck).toMatchObject({ enabled: false, chowdeck: null, sync: { state: 'off' } });
  });
});

describe('checkChannelPatch', () => {
  test('table and online are changed elsewhere', () => {
    expect(checkChannelPatch('table', { enabled: false }, connected)).toMatchObject({
      status: 422,
      code: 'channel_built_in',
    });
    expect(checkChannelPatch('online', {}, connected)).toMatchObject({ code: 'channel_built_in' });
  });

  test('chowdeck cannot be switched on before its keys are saved', () => {
    expect(checkChannelPatch('chowdeck', { enabled: true }, emptyChowdeck())).toMatchObject({
      status: 409,
      code: 'channel_not_connected',
    });
  });

  test('price rule and hidden dishes can be set before connecting', () => {
    const patch = {
      priceRule: { percent: 20, roundToPesewas: 50 as const },
      hiddenItemIds: ['itm_1'],
    };
    expect(checkChannelPatch('chowdeck', patch, emptyChowdeck())).toBeNull();
  });

  test('switching on with keys is fine', () => {
    expect(checkChannelPatch('chowdeck', { enabled: true }, connected)).toBeNull();
  });
});

describe('startPublish', () => {
  const at = Date.parse('2026-11-24T12:00:00.000Z');

  test('needs keys first', () => {
    const result = startPublish('chowdeck', emptyChowdeck(), at);
    expect(result).toMatchObject({ ok: false, status: 409, code: 'channel_not_connected' });
  });

  test('needs the channel switched on', () => {
    const result = startPublish('chowdeck', connected, at);
    expect(result).toMatchObject({ ok: false, status: 409, code: 'channel_off' });
  });

  test('built-in channels are never published', () => {
    expect(startPublish('table', connected, at)).toMatchObject({ code: 'channel_built_in' });
  });

  test('queues it: pending from now, keeping the menu the channel already has', () => {
    const before = {
      ...connected,
      enabled: true,
      sync: {
        state: 'synced' as const,
        at: '2026-11-23T08:00:00.000Z',
        menuUpdatedAt: '2026-11-23T07:00:00.000Z',
        problems: [],
      },
    };
    const result = startPublish('chowdeck', before, at);
    expect(result).toEqual({
      ok: true,
      sync: {
        state: 'pending',
        at: '2026-11-24T12:00:00.000Z',
        menuUpdatedAt: '2026-11-23T07:00:00.000Z',
        problems: [],
      },
    });
  });
});

describe('orderChannel', () => {
  test('uses the channel when the order has one', () => {
    expect(orderChannel({ channel: 'chowdeck', source: 'delivery' })).toBe('chowdeck');
  });

  test('older orders: a table order is table, a menu-link order is online', () => {
    expect(orderChannel({ source: 'table' })).toBe('table');
    expect(orderChannel({})).toBe('table');
    expect(orderChannel({ source: 'pickup' })).toBe('online');
    expect(orderChannel({ source: 'delivery' })).toBe('online');
  });
});

test('webhookUrlFor: one address for every venue, without a trailing slash', () => {
  expect(webhookUrlFor('https://api.example.com/')).toBe(
    'https://api.example.com/webhooks/chowdeck',
  );
});

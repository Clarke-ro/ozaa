// Generated from src/lib/channels.ts by scripts/sync-server-shared.mjs. Do not edit here.
import type {
  Channel,
  ChannelKind,
  ChannelPatch,
  ChannelSync,
  ChowdeckConnection,
  Order,
} from './types.ts';

/**
 * Where a venue's menu goes (docs/connectors-plan.md). `table` and `online` are built in: they
 * read the menu directly, so they are always up to date and use the menu price. Outside channels
 * (Chowdeck first) keep their own settings and a copy of the menu that has to be sent.
 * Shared with the server (scripts/sync-server-shared.mjs), so the mock and the server agree.
 */

/** What we keep for Chowdeck. `connection` is what the app may see; the keys stay on the server. */
export type ChowdeckState = Pick<Channel, 'enabled' | 'priceRule' | 'hiddenItemIds' | 'sync'> & {
  connection: ChowdeckConnection | null;
};

export type ChannelRefusal = {
  status: 409 | 422;
  code: 'channel_built_in' | 'channel_not_connected' | 'channel_off';
  message: string;
};

const MENU_PRICE = { percent: 0, roundToPesewas: 1 } as const;
const NEVER_SENT: ChannelSync = { state: 'off', at: null, menuUpdatedAt: null, problems: [] };
// Built-in channels read the live menu, so there's never anything to send.
const LIVE: ChannelSync = { state: 'synced', at: null, menuUpdatedAt: null, problems: [] };

export function emptyChowdeck(): ChowdeckState {
  return {
    enabled: false,
    priceRule: { ...MENU_PRICE },
    hiddenItemIds: [],
    sync: { ...NEVER_SENT, problems: [] },
    connection: null,
  };
}

/** Every channel, always in the same order: table, online, chowdeck. */
export function channelList(input: { onlineEnabled: boolean; chowdeck: ChowdeckState }): Channel[] {
  const builtIn = (kind: ChannelKind, enabled: boolean): Channel => ({
    kind,
    enabled,
    priceRule: { ...MENU_PRICE },
    hiddenItemIds: [],
    sync: { ...LIVE, problems: [] },
    chowdeck: null,
  });
  const { connection, ...chowdeck } = input.chowdeck;
  return [
    builtIn('table', true),
    builtIn('online', input.onlineEnabled),
    { kind: 'chowdeck', ...chowdeck, chowdeck: connection },
  ];
}

const builtIn = (kind: ChannelKind): ChannelRefusal | null =>
  kind === 'chowdeck'
    ? null
    : {
        status: 422,
        code: 'channel_built_in',
        message:
          kind === 'online'
            ? 'Turn the menu link on or off in Online ordering.'
            : 'The table menu is always on.',
      };

const notConnected: ChannelRefusal = {
  status: 409,
  code: 'channel_not_connected',
  message: 'Add your Chowdeck keys first.',
};

/** Null when the change is allowed. Price and hidden dishes can be set before the keys. */
export function checkChannelPatch(
  kind: ChannelKind,
  patch: ChannelPatch,
  current: ChowdeckState,
): ChannelRefusal | null {
  const refused = builtIn(kind);
  if (refused) return refused;
  if (patch.enabled === true && !current.connection) return notConnected;
  return null;
}

/**
 * Asking to send the menu: it's queued (`pending`), and the menu the channel already has is
 * kept until the send finishes, so "out of date" stays true until it really is up to date.
 */
export function startPublish(
  kind: ChannelKind,
  current: ChowdeckState,
  now: number,
): { ok: true; sync: ChannelSync } | ({ ok: false } & ChannelRefusal) {
  const refused = builtIn(kind) ?? (current.connection ? null : notConnected);
  if (refused) return { ok: false, ...refused };
  if (!current.enabled)
    return {
      ok: false,
      status: 409,
      code: 'channel_off',
      message: 'Turn Chowdeck on before you publish.',
    };
  return {
    ok: true,
    sync: {
      state: 'pending',
      at: new Date(now).toISOString(),
      menuUpdatedAt: current.sync.menuUpdatedAt,
      problems: [],
    },
  };
}

/** The channel an order came in on. Older orders have none: their source tells us. */
export function orderChannel(order: Partial<Pick<Order, 'channel' | 'source'>>): ChannelKind {
  if (order.channel) return order.channel;
  return !order.source || order.source === 'table' ? 'table' : 'online';
}

/** The address the owner pastes into Chowdeck. One for every venue: the order says whose it is. */
export function webhookUrlFor(apiBase: string): string {
  return `${apiBase.replace(/\/+$/, '')}/webhooks/chowdeck`;
}

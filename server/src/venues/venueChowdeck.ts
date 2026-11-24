import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { chowdeckChannels } from '../db/schema.ts';
import { emptyChowdeck, type ChowdeckState } from '../shared/channels.ts';
import type { ChannelSync, ChowdeckKeysInput } from '../shared/types.ts';
import { sealSecret, secretHint } from '../secrets/sealed.ts';

type Row = typeof chowdeckChannels.$inferSelect;
type Settings = Pick<ChowdeckState, 'enabled' | 'priceRule' | 'hiddenItemIds' | 'sync'>;

/**
 * Each venue's Chowdeck channel. The keys are sealed with the server's key before they are stored
 * and are never read back here: only the connector (BUILD.md 5b.11) will open them, to call
 * Chowdeck and check its webhooks.
 */
export function venueChowdeck(deps: { db: Db; key: Buffer }) {
  const { db, key } = deps;

  /** The channel as the app may see it. `webhookUrl` is worked out per request, not stored. */
  const stateOf = (row: Row | undefined, webhookUrl: string): ChowdeckState => {
    if (!row) return emptyChowdeck();
    const connected = row.merchantReference && row.secretHint && row.connectedAt;
    return {
      enabled: row.enabled,
      priceRule: row.priceRule as ChowdeckState['priceRule'],
      hiddenItemIds: row.hiddenItemIds as string[],
      sync: row.sync as ChannelSync,
      connection: connected
        ? {
            mode: 'test',
            merchantReference: row.merchantReference!,
            secretKeyHint: row.secretHint!,
            webhookUrl,
            connectedAt: row.connectedAt!.toISOString(),
          }
        : null,
    };
  };

  async function read(venueId: string, webhookUrl: string): Promise<ChowdeckState> {
    const [row] = await db
      .select()
      .from(chowdeckChannels)
      .where(eq(chowdeckChannels.venueId, venueId));
    return stateOf(row, webhookUrl);
  }

  /** Saves the settings; a venue gets its row the first time anything is saved. */
  async function saveSettings(venueId: string, settings: Settings, now: number): Promise<void> {
    const values = { ...settings, updatedAt: new Date(now) };
    await db
      .insert(chowdeckChannels)
      .values({ venueId, ...values })
      .onConflictDoUpdate({ target: chowdeckChannels.venueId, set: values });
  }

  return {
    read,
    saveSettings,

    async saveKeys(venueId: string, keys: ChowdeckKeysInput, now: number): Promise<void> {
      const values = {
        merchantReference: keys.merchantReference.trim(),
        secretEncrypted: sealSecret(key, keys.secretKey.trim()),
        secretHint: secretHint(keys.secretKey.trim()),
        webhookSecretEncrypted: sealSecret(key, keys.webhookSecret.trim()),
        connectedAt: new Date(now),
        updatedAt: new Date(now),
      };
      const fresh = emptyChowdeck();
      await db
        .insert(chowdeckChannels)
        .values({
          venueId,
          enabled: false,
          priceRule: fresh.priceRule,
          hiddenItemIds: [],
          sync: fresh.sync,
          ...values,
        })
        .onConflictDoUpdate({ target: chowdeckChannels.venueId, set: values });
    },

    /** Forgets the keys and switches the channel off. Price rule and hidden dishes stay. */
    async removeKeys(venueId: string, now: number): Promise<void> {
      await db
        .update(chowdeckChannels)
        .set({
          enabled: false,
          merchantReference: null,
          secretEncrypted: null,
          secretHint: null,
          webhookSecretEncrypted: null,
          connectedAt: null,
          updatedAt: new Date(now),
        })
        .where(eq(chowdeckChannels.venueId, venueId));
    },
  };
}

export type VenueChowdeckStore = ReturnType<typeof venueChowdeck>;

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bike } from 'lucide-react-native';
import type { ChowdeckState } from './chowdeck';
import { chowdeckState } from './chowdeck';
import { ConfirmDialog } from '../../kit';
import { ChowdeckKeysForm } from './ChowdeckKeysForm';
import { ChowdeckSettings } from './ChowdeckSettings';
import { IntegrationCard } from './IntegrationCard';
import { useChowdeck } from './useChowdeck';

const timeOf = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

/**
 * Chowdeck on Integrations > Delivery apps (docs/connectors-plan.md). Without keys the switch
 * opens the key form; with keys it turns the channel on or off, and the details hold the price
 * rule, dishes left off and Publish. Development only: test keys, and the server only queues
 * the menu until the connector is built (BUILD.md 5b.11).
 */
export function ChowdeckCard({ venueId }: { venueId: string }) {
  const { t } = useTranslation();
  const chowdeck = useChowdeck(venueId);
  const [opening, setOpening] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [closeSignal, setCloseSignal] = useState(0);
  const channel = chowdeck.channel;
  if (!channel) return null;

  const state = chowdeckState(
    channel,
    chowdeck.menu?.updatedAt ?? channel.sync.menuUpdatedAt ?? '',
  );
  const words: Record<ChowdeckState['kind'], string> = {
    not_connected: t('ownerPay.notConnected'),
    off: t('ownerChannels.state.off'),
    not_sent: t('ownerChannels.state.notSent'),
    sending: t('ownerChannels.state.sending'),
    sent: t('ownerChannels.state.sent', { time: 'at' in state ? timeOf(state.at) : '' }),
    changed: t('ownerChannels.state.changed'),
    failed: t('ownerChannels.state.failed'),
  };
  const connected = Boolean(channel.chowdeck);
  const on = connected ? channel.enabled : opening;
  const onToggle = (next: boolean) =>
    connected ? chowdeck.update.mutate({ enabled: next }) : setOpening(next);

  return (
    <IntegrationCard
      icon={Bike}
      title={t('ownerChannels.chowdeck')}
      subtitle={t('ownerChannels.chowdeckSub')}
      status={words[state.kind]}
      on={on}
      canOpen={connected}
      onToggle={onToggle}
      closeSignal={closeSignal}
    >
      {connected ? (
        <ChowdeckSettings
          key={`${channel.priceRule.percent}-${channel.priceRule.roundToPesewas}-${channel.hiddenItemIds.join()}`}
          channel={channel}
          menu={chowdeck.menu}
          currency={chowdeck.currency}
          saving={chowdeck.update.isPending}
          publishing={chowdeck.publish.isPending || state.kind === 'sending'}
          onSave={(patch) => chowdeck.update.mutate(patch)}
          onPublish={() => chowdeck.publish.mutate()}
          onDisconnect={() => setConfirming(true)}
        />
      ) : (
        <ChowdeckKeysForm
          connecting={chowdeck.connect.isPending}
          onConnect={(keys) =>
            chowdeck.connect.mutate(
              { mode: 'test', ...keys },
              {
                onSuccess: () => {
                  setOpening(false);
                  setCloseSignal((n) => n + 1);
                },
              },
            )
          }
        />
      )}
      <ConfirmDialog
        visible={confirming}
        destructive
        title={t('ownerChannels.disconnectTitle')}
        message={t('ownerChannels.disconnectBody')}
        confirmLabel={t('ownerChannels.disconnect')}
        loading={chowdeck.disconnect.isPending}
        onConfirm={() =>
          chowdeck.disconnect.mutate(undefined, { onSuccess: () => setConfirming(false) })
        }
        onCancel={() => setConfirming(false)}
      />
    </IntegrationCard>
  );
}

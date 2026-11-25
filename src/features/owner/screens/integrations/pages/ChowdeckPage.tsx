import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bike } from 'lucide-react-native';
import { DeskWait } from '../../../chrome/OwnerPage';
import { ConfirmDialog, InfoRow, Section, SectionBody, SwitchRow } from '../../../kit';
import { chowdeckState } from '../chowdeck';
import { useChowdeckWords } from '../ChowdeckCard';
import { ChowdeckKeysForm } from '../ChowdeckKeysForm';
import { ChowdeckSettings } from '../ChowdeckSettings';
import { useChowdeck } from '../useChowdeck';
import type { PageProps } from './IntegrationPage';

/**
 * Chowdeck's page: the keys while not connected; once connected, the switch, the last send, and
 * the settings (webhook address, price rule, dishes left off, Save, Publish). Development only:
 * test keys, and the server only queues the menu until the connector is built (BUILD.md 5b.11).
 */
export function ChowdeckPage({ venueId, done }: PageProps) {
  const { t } = useTranslation();
  const chowdeck = useChowdeck(venueId);
  const words = useChowdeckWords();
  const [confirming, setConfirming] = useState(false);
  const channel = chowdeck.channel;
  const state = channel
    ? chowdeckState(channel, chowdeck.menu?.updatedAt ?? channel.sync.menuUpdatedAt ?? '')
    : null;

  return (
    <DeskWait loading={chowdeck.loading} error={false} onRetry={() => undefined}>
      {channel && state && channel.chowdeck ? (
        <>
          <Section>
            <SwitchRow
              icon={Bike}
              label={t('ownerChannels.chowdeck')}
              value={channel.enabled}
              onChange={(enabled) => chowdeck.update.mutate({ enabled })}
            />
            <InfoRow label={t('ownerChannels.status')} value={words(state)} />
          </Section>
          <Section title={t('ownerChannels.settingsTitle')}>
            <SectionBody>
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
            </SectionBody>
          </Section>
        </>
      ) : channel ? (
        <Section title={t('ownerChannels.keysTitle')}>
          <SectionBody>
            <ChowdeckKeysForm
              connecting={chowdeck.connect.isPending}
              onConnect={(keys) => chowdeck.connect.mutate({ mode: 'test', ...keys })}
            />
          </SectionBody>
        </Section>
      ) : null}
      <ConfirmDialog
        visible={confirming}
        destructive
        title={t('ownerChannels.disconnectTitle')}
        message={t('ownerChannels.disconnectBody')}
        confirmLabel={t('ownerChannels.disconnect')}
        loading={chowdeck.disconnect.isPending}
        onConfirm={() =>
          chowdeck.disconnect.mutate(undefined, {
            onSuccess: () => {
              setConfirming(false);
              done();
            },
          })
        }
        onCancel={() => setConfirming(false)}
      />
    </DeskWait>
  );
}

import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait } from '../../../chrome/OwnerPage';
import { cardStyle, ConfirmDialog, SwitchRow, TitledSection } from '../../../kit';
import { FormLabel } from '../../menu/FormLabel';
import { fieldStyles } from '../../menu/fieldStyles';
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
  const theme = useTheme();
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
          <TitledSection plain title={t('ownerChannels.sendTitle')}>
            <View style={cardStyle(theme)}>
              <SwitchRow
                label={t('ownerChannels.chowdeck')}
                value={channel.enabled}
                onChange={(enabled) => chowdeck.update.mutate({ enabled })}
              />
            </View>
            <View style={fieldStyles.block}>
              <FormLabel>{t('ownerChannels.status')}</FormLabel>
              <Text>{words(state)}</Text>
            </View>
          </TitledSection>
          <TitledSection plain title={t('ownerChannels.settingsTitle')}>
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
          </TitledSection>
        </>
      ) : channel ? (
        <TitledSection plain title={t('ownerChannels.keysTitle')}>
          <ChowdeckKeysForm
            connecting={chowdeck.connect.isPending}
            onConnect={(keys) => chowdeck.connect.mutate({ mode: 'test', ...keys })}
          />
        </TitledSection>
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

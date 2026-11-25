import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bike } from 'lucide-react-native';
import type { ChowdeckState } from './chowdeck';
import { IntegrationCard } from './IntegrationCard';
import { useChowdeck } from './useChowdeck';

const timeOf = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

/** Chowdeck's status in words, shown on its own page. */
export function useChowdeckWords() {
  const { t } = useTranslation();
  return (state: ChowdeckState): string => {
    switch (state.kind) {
      case 'not_connected':
        return t('ownerPay.notConnected');
      case 'off':
        return t('ownerChannels.state.off');
      case 'not_sent':
        return t('ownerChannels.state.notSent');
      case 'sending':
        return t('ownerChannels.state.sending');
      case 'sent':
        return t('ownerChannels.state.sent', { time: timeOf(state.at) });
      case 'changed':
        return t('ownerChannels.state.changed');
      case 'failed':
        return t('ownerChannels.state.failed');
    }
  };
}

/**
 * Chowdeck on Integrations > Delivery apps (docs/connectors-plan.md). Without keys the switch and
 * the card open its page to connect; with keys the switch turns the channel on or off, and the
 * card opens its settings (price rule, dishes left off, Publish). Development only: test keys.
 */
export function ChowdeckCard({ venueId }: { venueId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const chowdeck = useChowdeck(venueId);
  const channel = chowdeck.channel;
  if (!channel) return null;
  const open = () => router.push('/owner/integrations/chowdeck');
  return (
    <IntegrationCard
      icon={Bike}
      title={t('ownerChannels.chowdeck')}
      subtitle={t('ownerChannels.chowdeckSub')}
      on={channel.chowdeck ? channel.enabled : false}
      onToggle={(enabled) => (channel.chowdeck ? chowdeck.update.mutate({ enabled }) : open())}
      onOpen={open}
    />
  );
}

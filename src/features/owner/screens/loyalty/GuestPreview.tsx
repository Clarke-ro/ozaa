import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { PhoneFrame } from '../menu/live/PhoneFrame';
import { StampPreview } from './StampPreview';

/**
 * "What guests see" beside the programme on a desktop (design canvas): a phone with the venue's
 * name and the stamp card as it will look with the settings being edited, before they are saved.
 */
export function GuestPreview({
  venueId,
  stamps,
  reward,
}: {
  venueId: string;
  stamps: number;
  reward: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  return (
    <View style={styles.wrap}>
      <Text variant="title" accessibilityRole="header">
        {t('ownerLoyalty.guestsSee')}
      </Text>
      <PhoneFrame label={t('ownerLoyalty.guestsSee')}>
        <View style={styles.screen}>
          <Text style={styles.venue} numberOfLines={1}>
            {venue.data?.name ?? ''}
          </Text>
          <Text style={[styles.lead, { color: theme.muted }]}>{t('ownerLoyalty.previewLead')}</Text>
          <StampPreview stamps={stamps} reward={reward} />
        </View>
      </PhoneFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[4] },
  screen: { flex: 1, padding: tokens.space[5], paddingTop: tokens.space[12], gap: tokens.space[3] },
  venue: { fontSize: 20, lineHeight: 26, fontFamily: fontFamily.strong },
  lead: { fontSize: 14, lineHeight: 20 },
});

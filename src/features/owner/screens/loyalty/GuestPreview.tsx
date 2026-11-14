import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Gift, QrCode } from 'lucide-react-native';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, ThemeProvider, themeFromAccent, useTheme, type FontPair } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { PhoneFrame } from '../menu/live/PhoneFrame';
import type { Reward } from './program';

// A member part-way round the card, so the preview shows stamped and empty circles together.
const SAMPLE_PROGRESS = 0.4;
const PER_ROW = 5;

/**
 * "What guests see" (canvas GuestLoyalty board): a member's card in the venue colour with their
 * stamps, Show my card, and the rewards with how far away each is. Drawn from the settings being
 * edited, before they are saved, with a sample member part-way round.
 */
export function GuestPreview({
  venueId,
  stamps,
  rewards,
  tiersOn,
}: {
  venueId: string;
  stamps: number;
  rewards: Reward[];
  tiersOn: boolean;
}) {
  const owner = useTheme();
  const { t } = useTranslation();
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const v = venue.data;
  const guest = themeFromAccent(
    v?.theme.accent,
    (v?.theme.fontPair ?? 'cravins') as FontPair,
    'light',
  );
  const have = Math.floor(stamps * SAMPLE_PROGRESS);
  const named = rewards.filter((r) => r.title.trim()).sort((a, b) => a.cost - b.cost);
  const next = named.find((r) => r.cost > have);
  const size = 34;
  return (
    <View style={styles.wrap}>
      <Text variant="title" accessibilityRole="header">
        {t('ownerLoyalty.guestsSee')}
      </Text>
      <ThemeProvider theme={guest}>
        <PhoneFrame label={t('ownerLoyalty.guestsSee')}>
          <View style={styles.screen} pointerEvents="none" accessibilityElementsHidden>
            <Text style={styles.top}>{t('loyalty.title')}</Text>
            <View style={[styles.card, { backgroundColor: guest.fill }]}>
              <View style={styles.head}>
                <Text
                  style={[styles.venue, { color: guest.onFill, fontFamily: guest.displayFont }]}
                  numberOfLines={1}
                >
                  {v?.name ?? ''}
                </Text>
                {tiersOn ? (
                  <View style={styles.tier}>
                    <Text style={[styles.small, { color: guest.onFill }]}>
                      {t('ownerLoyalty.tier.bronze')}
                    </Text>
                  </View>
                ) : null}
                <Text style={[styles.count, { color: guest.onFill }]}>
                  {t('ownerLoyalty.previewCount', { count: have, total: stamps })}
                </Text>
              </View>
              <View style={[styles.dots, { maxWidth: size * PER_ROW + 10 * (PER_ROW - 1) }]}>
                {Array.from({ length: stamps }, (_, i) => {
                  const last = i === stamps - 1;
                  const on = i < have;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        {
                          width: size,
                          height: size,
                          borderRadius: size / 2,
                          borderColor: guest.onFill,
                        },
                        on && { backgroundColor: guest.onFill },
                        last && styles.dashed,
                      ]}
                    >
                      {on ? (
                        <View style={[styles.inner, { backgroundColor: guest.fill }]} />
                      ) : last ? (
                        <Gift size={14} color={guest.onFill} />
                      ) : null}
                    </View>
                  );
                })}
              </View>
              {next ? (
                <Text style={[styles.line, { color: guest.onFill }]} numberOfLines={2}>
                  {t('ownerLoyalty.previewNext', { count: next.cost - have, reward: next.title })}
                </Text>
              ) : null}
            </View>
            <View style={[styles.row, { borderColor: guest.line }]}>
              <QrCode size={18} color={guest.text} />
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{t('ownerLoyalty.previewShow')}</Text>
                <Text style={[styles.small, { color: guest.muted }]}>
                  {t('ownerLoyalty.previewShowSub')}
                </Text>
              </View>
              <ChevronRight size={16} color={guest.meta} />
            </View>
            {named.length ? (
              <Text style={[styles.section, { fontFamily: guest.displayFont }]}>
                {t('ownerLoyalty.previewRewards')}
              </Text>
            ) : null}
            {named.map((r) => (
              <View key={r.id} style={[styles.row, { borderColor: guest.line }]}>
                <Gift size={18} color={guest.ink} />
                <View style={styles.flex}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {r.title}
                  </Text>
                  <Text style={[styles.small, { color: guest.muted }]}>
                    {t('ownerLoyalty.atStamps', { count: r.cost })}
                  </Text>
                </View>
                <Text style={[styles.small, { color: guest.muted }]}>
                  {r.cost > have
                    ? t('ownerLoyalty.toGo', { count: r.cost - have })
                    : t('ownerLoyalty.ready')}
                </Text>
              </View>
            ))}
          </View>
        </PhoneFrame>
      </ThemeProvider>
      <Text variant="caption" style={[styles.note, { color: owner.meta }]}>
        {t('ownerLoyalty.previewNote')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[4] },
  screen: { flex: 1, paddingTop: 52, paddingHorizontal: 14, gap: 10 },
  top: { textAlign: 'center', fontSize: 15, fontFamily: fontFamily.strong, marginBottom: 6 },
  card: { borderRadius: 16, padding: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  venue: { flex: 1, fontSize: 17 },
  tier: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  count: { fontSize: 13, fontFamily: fontFamily.strong },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dot: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', opacity: 0.95 },
  inner: { width: 12, height: 12, borderRadius: 6 },
  dashed: { borderStyle: 'dashed' },
  line: { fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  flex: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 13, fontFamily: fontFamily.strong },
  small: { fontSize: 11 },
  section: { fontSize: 16, marginTop: 6 },
  note: { textAlign: 'center' },
});

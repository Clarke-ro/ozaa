import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Gift, Utensils } from 'lucide-react-native';
import { qrSvg } from '@/lib/qrSvg';
import { QR_PAPER } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { Wallet } from './facts';
import type { StampCard } from './loyaltyRules';
import { TIER_ICON } from './TierIcon';
import { scanFrameWatermarkSvg } from './walletWatermark';

const BADGE = 42;
const STAMP_MAX = 56;
const STAMP_GAP = tokens.space[3];
const STAMP_ICON = 18;
const SMALL_QR = 44;
// Even rows: 4 across up to 8 stamps, then two rows of up to 6.
const columnsFor = (count: number) => (count <= 8 ? 4 : Math.ceil(count / 2));
const WATERMARK = 220;

/** The face guests see first: venue, tier icon, the stamp circles (or points bar), count and a small QR. */
export function WalletCardFront({
  venueName,
  venueInitials,
  wallet,
  card,
  qrText,
}: {
  venueName: string;
  venueInitials: string;
  wallet: Wallet;
  card: StampCard;
  qrText: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const ink = theme.onFill;
  const TierGlyph = TIER_ICON[wallet.tier];
  const points = wallet.progress.kind === 'points';
  const share = Math.min(1, wallet.progress.balance / Math.max(1, card.goal));
  // The circles fill the card's width, so a 12-stamp card still fits on a small phone.
  const [rowWidth, setRowWidth] = useState(0);
  const columns = columnsFor(card.slots.length);
  const size = rowWidth
    ? Math.min(STAMP_MAX, (rowWidth - STAMP_GAP * (columns - 1)) / columns)
    : STAMP_MAX;
  const rows = Array.from({ length: Math.ceil(card.slots.length / columns) }, (_, r) =>
    card.slots.slice(r * columns, r * columns + columns),
  );

  return (
    <View style={[styles.face, { backgroundColor: theme.fill }]}>
      <View pointerEvents="none" style={styles.watermark}>
        <SvgXml xml={scanFrameWatermarkSvg(ink)} width={WATERMARK} height={WATERMARK} />
      </View>

      <View style={styles.top}>
        <View style={[styles.badge, { borderColor: ink }]}>
          <Text variant="body-strong" style={{ color: ink }}>
            {venueInitials}
          </Text>
        </View>
        <Text variant="title" numberOfLines={1} style={[styles.name, { color: ink }]}>
          {venueName}
        </Text>
        <View style={[styles.tier, { borderColor: ink }]}>
          <TierGlyph color={ink} size={18} strokeWidth={2} />
        </View>
      </View>

      <View style={styles.middle} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
        {points ? (
          <View style={[styles.track, { borderColor: ink }]}>
            <View
              style={[
                styles.trackFill,
                { backgroundColor: ink, width: `${Math.round(share * 100)}%` },
              ]}
            />
          </View>
        ) : (
          <View style={styles.stamps}>
            {rows.map((row, r) => (
              <View key={r} style={styles.stampRow}>
                {row.map((slot, index) => (
                  <View
                    key={index}
                    style={[
                      styles.stamp,
                      { width: size, height: size, borderRadius: size / 2 },
                      slot.stamped
                        ? { backgroundColor: ink, borderColor: ink, borderStyle: 'solid' }
                        : { borderColor: ink, borderStyle: 'dashed' },
                    ]}
                  >
                    {slot.reward ? (
                      <Gift
                        color={slot.stamped ? theme.fill : ink}
                        size={STAMP_ICON}
                        strokeWidth={2}
                      />
                    ) : slot.stamped ? (
                      <Utensils color={theme.fill} size={STAMP_ICON} strokeWidth={2.2} />
                    ) : null}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.bottom}>
        <Text variant="display-l" style={[styles.counter, { color: ink }]}>
          {points ? t('loyalty.pointsCounter', { counter: card.counter }) : card.counter}
        </Text>
        <View style={styles.smallQr}>
          <SvgXml xml={qrSvg(qrText, SMALL_QR)} width={SMALL_QR} height={SMALL_QR} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: tokens.radius.xl,
    borderCurve: 'continuous',
    padding: tokens.space[5],
    overflow: 'hidden',
    justifyContent: 'space-between',
    backfaceVisibility: 'hidden',
  },
  // Top right, behind the tier icon, so it never sits under the QR.
  watermark: { position: 'absolute', right: -60, top: -60, opacity: 0.1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { flex: 1 },
  tier: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, justifyContent: 'center' },
  stamps: { gap: STAMP_GAP, alignSelf: 'center' },
  stampRow: { flexDirection: 'row', gap: STAMP_GAP },
  stamp: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { height: 14, borderRadius: tokens.radius.full, borderWidth: 1.5, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: tokens.radius.full },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  counter: { fontVariant: ['tabular-nums'] },
  smallQr: { backgroundColor: QR_PAPER, borderRadius: tokens.radius.sm, padding: 5 },
});

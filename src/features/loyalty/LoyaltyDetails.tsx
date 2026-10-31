import { Pressable, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Award, Gamepad2, Gift, Receipt } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { qrSvg } from '@/lib/qrSvg';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { Programme, Wallet } from './facts';

export function LoyaltyDetails({
  programme,
  wallet,
  gameMinScore,
  redeemingId,
  onRedeem,
}: {
  programme: Programme;
  wallet: Wallet | null;
  gameMinScore: number | null;
  redeemingId: string | null;
  onRedeem?: (rewardId: string) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const rewards = wallet
    ? wallet.catalogue
    : programme.rewards.map((item) => ({ ...item, affordable: false }));

  return (
    <View style={{ gap: 22 }}>
      {wallet?.liveClaim ? (
        <View style={[styles.claimBox, { borderColor: theme.fill, backgroundColor: theme.tint }]}>
          <View style={styles.claimRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="caption" style={{ color: theme.badgeInk, fontFamily: 'Inter_600' }}>
                {t('loyalty.claimTitle')}
              </Text>
              <Text variant="display-l" style={styles.claimCode}>
                {wallet.liveClaim.code}
              </Text>
              <Text variant="body-strong">{wallet.liveClaim.title}</Text>
              <Text variant="caption" style={{ color: theme.muted }}>
                {t('loyalty.claimExpires', { time: wallet.liveClaim.expiresAt.slice(11, 16) })}
              </Text>
            </View>
            <View style={styles.qrWrap}>
              <SvgXml xml={qrSvg(wallet.liveClaim.code, 108)} width={108} height={108} />
            </View>
          </View>
          <Text variant="caption" style={{ color: theme.muted }}>
            {t('loyalty.claimLead')}
          </Text>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Text variant="display-m">{t('loyalty.yourRewards')}</Text>
        {rewards.map((reward) => {
          const ratio = wallet
            ? Math.min(1, wallet.progress.balance / Math.max(1, reward.cost))
            : 0;
          return (
            <View key={reward.id} style={[styles.rowCard, { borderColor: theme.line }]}>
              <View style={[styles.iconBox, { backgroundColor: theme.tint }]}>
                <Gift color={theme.ink} size={20} strokeWidth={2} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="body-strong">{reward.title}</Text>
                <Text variant="caption" style={{ color: theme.muted }}>
                  {programme.earn.kind === 'stamps'
                    ? t('loyalty.atStamps', { count: reward.cost })
                    : t('loyalty.atPoints', { count: reward.cost })}
                </Text>
                {wallet && !reward.affordable ? (
                  <View style={[styles.barTrack, { backgroundColor: theme.wash }]}>
                    <View
                      style={[
                        styles.barFill,
                        { backgroundColor: theme.fill, width: `${Math.round(ratio * 100)}%` },
                      ]}
                    />
                  </View>
                ) : null}
              </View>
              {reward.affordable && onRedeem ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('loyalty.redeem')} ${reward.title}`}
                  disabled={redeemingId === reward.id}
                  onPress={() => onRedeem(reward.id)}
                  style={[styles.redeemPill, { backgroundColor: theme.fill }]}
                >
                  <Text variant="caption" style={{ color: theme.onFill, fontFamily: 'Inter_600' }}>
                    {t('loyalty.redeem')}
                  </Text>
                </Pressable>
              ) : wallet && wallet.progress.balance >= reward.cost ? (
                <View style={[styles.readyPill, { backgroundColor: theme.tint }]}>
                  <Text variant="caption" style={{ color: theme.badgeInk, fontFamily: 'Inter_600' }}>
                    {t('loyalty.ready')}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={{ gap: 10 }}>
        <Text variant="display-m">{t('loyalty.tiersTitle')}</Text>
        <View style={styles.tierRow}>
          {programme.tiers.map((band) => {
            const active = wallet?.tier === band.id;
            return (
              <View
                key={band.id}
                style={[
                  styles.tierCard,
                  {
                    borderColor: active ? theme.fill : theme.line,
                    backgroundColor: active ? theme.tint : theme.white,
                  },
                ]}
              >
                <Award color={active ? theme.badgeInk : theme.meta} size={18} strokeWidth={2} />
                <Text variant="body-strong">{t(`loyalty.tiers.${band.id}`)}</Text>
                <Text variant="caption" style={{ color: theme.muted }}>
                  {programme.earn.kind === 'stamps'
                    ? t('loyalty.tierThresholdStamps', { count: band.minLifetime })
                    : t('loyalty.tierThresholdPoints', { count: band.minLifetime })}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Text variant="display-m">{t('loyalty.howToEarn')}</Text>
        <View style={[styles.rowCard, { borderColor: theme.line }]}>
          <View style={[styles.iconBox, { backgroundColor: theme.wash }]}>
            <Receipt color={theme.ink} size={20} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="body-strong">
              {programme.earn.kind === 'stamps'
                ? t('loyalty.earnStampVisit')
                : t('loyalty.earnPointsSpend', {
                    points: programme.earn.points,
                    spend: formatMoney(pesewas(programme.earn.perMinor), programme.currency),
                  })}
            </Text>
            <Text variant="caption" style={{ color: theme.muted }}>
              {programme.earn.kind === 'stamps'
                ? t('loyalty.earnStampVisitSub')
                : t('loyalty.earnPointsSpendSub')}
            </Text>
          </View>
        </View>
        {gameMinScore != null ? (
          <View style={[styles.rowCard, { borderColor: theme.line }]}>
            <View style={[styles.iconBox, { backgroundColor: theme.wash }]}>
              <Gamepad2 color={theme.ink} size={20} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body-strong">{t('loyalty.earnGame', { score: gameMinScore })}</Text>
              <Text variant="caption" style={{ color: theme.muted }}>
                {t('loyalty.earnGameSub')}
              </Text>
            </View>
          </View>
        ) : null}
        {programme.birthdayTreat ? (
          <View style={[styles.rowCard, { borderColor: theme.line }]}>
            <View style={[styles.iconBox, { backgroundColor: theme.wash }]}>
              <Gift color={theme.ink} size={20} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body-strong">{t('loyalty.earnBirthday')}</Text>
              <Text variant="caption" style={{ color: theme.muted }}>
                {programme.birthdayTreat}
              </Text>
            </View>
          </View>
        ) : null}
        <Text variant="caption" style={{ color: theme.meta }}>
          {programme.expiryDays
            ? t('loyalty.expiryDays', { days: programme.expiryDays })
            : t('loyalty.expiryNever')}
        </Text>
      </View>

      {wallet ? (
        <View style={{ gap: 10 }}>
          <Text variant="display-m">{t('loyalty.historyTitle')}</Text>
          {wallet.history.length === 0 ? (
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('loyalty.historyEmpty')}
            </Text>
          ) : (
            [...wallet.history].reverse().map((row, index) => (
              <View key={`${row.at}-${index}`} style={[styles.historyRow, { borderColor: theme.line }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="body-strong">
                    {row.source === 'paid_visit'
                      ? t('loyalty.historyVisit', {
                          amount: formatMoney(
                            pesewas(row.amountMinor ?? 0),
                            row.currency ?? programme.currency,
                          ),
                        })
                      : row.source === 'game'
                        ? t('loyalty.historyGame')
                        : row.source === 'birthday'
                          ? row.title ?? t('loyalty.historyBirthday')
                          : t('loyalty.historyRedeem', { title: row.title ?? '' })}
                  </Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    {row.at.slice(0, 10)}
                  </Text>
                </View>
                <Text
                  variant="body-strong"
                  style={{
                    color: row.direction === 'in' ? theme.success : theme.text,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {row.direction === 'in' ? `+${row.units}` : `−${row.units}`}
                </Text>
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  claimBox: { borderWidth: 1.5, borderRadius: 20, padding: 16, gap: 10 },
  claimRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  claimCode: { letterSpacing: 2, fontVariant: ['tabular-nums'] },
  qrWrap: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 8 },
  rowCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  barTrack: { height: 6, borderRadius: 999, overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 999 },
  redeemPill: { borderRadius: 999, paddingHorizontal: 14, height: 36, justifyContent: 'center' },
  readyPill: { borderRadius: 999, paddingHorizontal: 12, height: 30, justifyContent: 'center' },
  tierRow: { flexDirection: 'row', gap: 10 },
  tierCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 12, gap: 4 },
  historyRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

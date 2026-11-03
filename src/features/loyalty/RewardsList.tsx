import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gift } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import type { Programme, Wallet } from './facts';
import { GroupCard } from './GroupCard';
import { GroupRow } from './GroupRow';
import { SectionTitle } from './SectionTitle';

/** The member's rewards: what each costs, progress toward it, and Get claim code once it's earned. */
export function RewardsList({
  programme,
  wallet,
  redeemingId,
  onRedeem,
}: {
  programme: Programme;
  wallet: Wallet;
  redeemingId: string | null;
  onRedeem: (rewardId: string) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const stamps = programme.earn.kind === 'stamps';
  return (
    <View style={styles.section}>
      <SectionTitle>{t('loyalty.yourRewards')}</SectionTitle>
      <GroupCard>
        {wallet.catalogue.map((reward) => {
          const share = Math.min(1, wallet.progress.balance / Math.max(1, reward.cost));
          const earned = wallet.progress.balance >= reward.cost;
          return (
            <GroupRow
              key={reward.id}
              icon={Gift}
              title={reward.title}
              detail={
                stamps
                  ? t('loyalty.atStamps', { count: reward.cost })
                  : t('loyalty.atPoints', { count: reward.cost })
              }
              below={
                earned ? null : (
                  <View style={[styles.track, { backgroundColor: theme.wash }]}>
                    <View
                      style={[
                        styles.fill,
                        { backgroundColor: theme.fill, width: `${Math.round(share * 100)}%` },
                      ]}
                    />
                  </View>
                )
              }
              right={
                reward.affordable ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('loyalty.redeem')} ${reward.title}`}
                    disabled={redeemingId === reward.id}
                    onPress={() => onRedeem(reward.id)}
                    hitSlop={4}
                    style={({ pressed }) => [
                      styles.redeem,
                      { backgroundColor: pressed ? theme.pressed : theme.fill },
                    ]}
                  >
                    <Text variant="caption" style={[styles.strong, { color: theme.onFill }]}>
                      {t('loyalty.redeem')}
                    </Text>
                  </Pressable>
                ) : earned ? (
                  <View style={[styles.ready, { backgroundColor: theme.tint }]}>
                    <Text variant="caption" style={[styles.strong, { color: theme.badgeInk }]}>
                      {t('loyalty.ready')}
                    </Text>
                  </View>
                ) : null
              }
            />
          );
        })}
      </GroupCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space[3] },
  track: {
    height: 6,
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
    marginTop: tokens.space[2],
  },
  fill: { height: '100%', borderRadius: tokens.radius.full },
  redeem: {
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.space[3] + 2,
    height: 36,
    justifyContent: 'center',
  },
  ready: {
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.space[3],
    height: 30,
    justifyContent: 'center',
  },
  strong: { fontFamily: fontFamily.strong },
});

import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CircleCheck, X } from 'lucide-react-native';
import type { LoyaltyScanResult } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** What happened after a scan: the guest, their stamps, and Redeem when a reward is ready. */
export function ScanResult({
  result,
  target,
  busy,
  onRedeem,
  onClose,
}: {
  result: LoyaltyScanResult;
  /** Stamps needed for a reward, or undefined while the programme is still loading. */
  target: number | undefined;
  busy: boolean;
  onRedeem: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const name =
    result.card?.member?.firstName ||
    result.customerName ||
    result.card?.member?.phoneMasked ||
    t('ownerScan.member');
  const ready = target != null && result.stamps >= target;
  const left = target != null ? target - (result.stamps % target) : null;

  return (
    <View
      accessibilityRole="alert"
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.success }]}
    >
      <View style={styles.head}>
        <CircleCheck size={22} color={theme.success} />
        <View style={styles.flex}>
          <Text variant="body-strong">{name}</Text>
          {result.message ? (
            <Text variant="caption" style={{ color: theme.muted }}>
              {result.message}
            </Text>
          ) : null}
        </View>
        <CloseButton label={t('ownerScan.closeResult')} onPress={onClose} />
      </View>
      <View style={[styles.count, { backgroundColor: theme.successTint }]}>
        <Text variant="display-m" style={[styles.num, { color: theme.success }]}>
          {result.stamps}
        </Text>
        <View style={styles.flex}>
          <Text variant="body-strong">{t('ownerScan.stampsSoFar')}</Text>
          {ready ? (
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('ownerScan.rewardReady')}
            </Text>
          ) : left != null ? (
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('ownerScan.moreToGo', { count: left })}
            </Text>
          ) : null}
        </View>
      </View>
      {ready ? (
        <Button label={t('ownerScan.redeem')} tone="primary" loading={busy} onPress={onRedeem} />
      ) : null}
    </View>
  );
}

/** A scan that did not go through: cooldown, unknown card, or no connection. */
export function ScanProblem({ message, onClose }: { message: string; onClose: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.warning }]}
    >
      <View style={styles.head}>
        <AlertTriangle size={22} color={theme.warning} />
        <View style={styles.flex}>
          <Text variant="body-strong">{t('ownerScan.problemTitle')}</Text>
          <Text variant="caption" style={{ color: theme.muted }}>
            {message}
          </Text>
        </View>
        <CloseButton label={t('ownerScan.closeResult')} onPress={onClose} />
      </View>
    </View>
  );
}

function CloseButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.close}
    >
      <X size={18} color={theme.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.space[3],
    padding: tokens.space[4],
    boxShadow: tokens.shadow.card,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[3] },
  flex: { flex: 1, gap: 2 },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
  },
  num: { fontVariant: ['tabular-nums'] },
  close: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    margin: -tokens.space[3],
  },
});

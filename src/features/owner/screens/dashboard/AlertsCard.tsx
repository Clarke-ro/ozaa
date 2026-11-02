import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  ChevronRight,
  CircleCheck,
  Receipt,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import type { OwnerDashboard } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { SectionLabel } from '../../kit';

type Alert = OwnerDashboard['alerts'][number];

const TARGET: Record<Alert['code'], { href: string; icon: LucideIcon }> = {
  calls: { href: '/owner/calls', icon: Bell },
  bills: { href: '/owner/floor', icon: Receipt },
  payout: { href: '/owner/payments', icon: Wallet },
  sold_out: { href: '/owner/menu', icon: UtensilsCrossed },
};

/** What needs the owner right now. Each line opens the screen where it gets fixed. */
export function AlertsCard({ alerts }: { alerts: Alert[] }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const text = (alert: Alert) =>
    alert.code === 'calls'
      ? t('owner.alertCalls', { count: alert.count ?? 1 })
      : alert.code === 'bills'
        ? t('owner.alertBills', { count: alert.count ?? 1 })
        : alert.code === 'payout'
          ? t('owner.alertPayout')
          : t('owner.alertSold', { detail: alert.detail ?? '' });

  return (
    <View style={styles.wrap}>
      <SectionLabel title={t('ownerDash.needsYou')} caps />
      <View style={[styles.card, { borderColor: theme.line, backgroundColor: theme.surface }]}>
        {alerts.length === 0 ? (
          <View style={styles.row}>
            <CircleCheck size={20} color={theme.success} />
            <Text variant="body" style={{ color: theme.muted }}>
              {t('ownerDash.allClear')}
            </Text>
          </View>
        ) : (
          alerts.map((alert, index) => {
            const { href, icon: Icon } = TARGET[alert.code];
            return (
              <Pressable
                key={`${alert.code}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={text(alert)}
                onPress={() => router.push(href as Href)}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.line,
                  },
                  pressed && { backgroundColor: theme.wash },
                ]}
              >
                <View style={[styles.icon, { backgroundColor: theme.errorTint }]}>
                  <Icon size={18} color={theme.error} />
                </View>
                <Text variant="body-strong" style={styles.copy}>
                  {text(alert)}
                </Text>
                <ChevronRight size={20} color={theme.meta} />
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2] },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 56,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1 },
});

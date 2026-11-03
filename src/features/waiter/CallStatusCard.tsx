import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CircleCheck } from 'lucide-react-native';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/time';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { REASON_ICON } from './reasonIcon';

// Checks the call often enough that "on the way" shows within a few seconds of the tap.
const POLL_MS = 3000;

/** One call the guest made, live: waiting (and since when), who is coming, or done. */
export function CallStatusCard({ id, now }: { id: string; now: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const call = useQuery({
    queryKey: ['waiter', id],
    queryFn: () => api.getWaiterCall(id),
    // Stop asking once it is done.
    refetchInterval: (q) => (q.state.data?.status === 'resolved' ? false : POLL_MS),
  });
  const c = call.data;
  if (!c) return null;
  const Icon = REASON_ICON[c.reason];
  const done = c.status === 'resolved';
  const coming = c.status === 'acknowledged';
  const line = done
    ? t('waiter.done')
    : coming
      ? c.staffFirstName
        ? t('waiter.onTheWay', { name: c.staffFirstName })
        : t('waiter.someoneComing')
      : t('waiter.waiting', { when: timeAgo(c.createdAt, now, t) });

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.card, { backgroundColor: theme.surface }]}
    >
      <Icon size={24} color={done ? theme.muted : theme.ink} strokeWidth={2} />
      <View style={styles.copy}>
        <Text variant="body-strong">{t(`waiter.reasons.${c.reason}`)}</Text>
        <Text
          variant="caption"
          style={{ color: done ? theme.muted : coming ? theme.success : theme.muted }}
        >
          {line}
        </Text>
        {c.note ? (
          <Text variant="caption" numberOfLines={2} style={{ color: theme.muted }}>
            {c.note}
          </Text>
        ) : null}
      </View>
      {done || coming ? <CircleCheck size={20} color={done ? theme.meta : theme.success} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    minHeight: 64,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[5],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
  },
  copy: { flex: 1, gap: 2 },
});

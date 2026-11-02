import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { REASON_ICON } from '@/features/waiter';
import type { WaiterCall } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ticketAge } from '../../desk/ops';
import { StatusPill, type PillTone } from '../../kit';


const STATUS_TONE: Record<WaiterCall['status'], PillTone> = {
  open: 'error',
  acknowledged: 'waiting',
  resolved: 'success',
};

/** One guest call: what they need, which table, how long they've waited, and the next step. */
export function CallCard({
  call,
  now,
  busy,
  onAcknowledge,
  onResolve,
}: {
  call: WaiterCall;
  now: number;
  busy: boolean;
  onAcknowledge: () => void;
  onResolve: () => void;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const Icon = REASON_ICON[call.reason];
  const live = call.status !== 'resolved';
  const age = ticketAge(call.createdAt, now);
  const time = new Date(call.createdAt).toLocaleTimeString(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const meta = [
    t('ownerOrders.table', { code: call.tableCode }),
    live ? t('ownerCalls.waited', { count: age.minutes }) : time,
    call.staffFirstName ? t('ownerCalls.by', { name: call.staffFirstName }) : null,
  ].filter(Boolean);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.error,
          // Clean card by default; a guest waiting too long gets a red edge.
          borderWidth: live && age.tone === 'very_late' ? 1.5 : 0,
        },
      ]}
    >
      <View style={styles.head}>
        <View
          style={[
            styles.icon,
            { backgroundColor: call.status === 'open' ? theme.errorTint : theme.wash },
          ]}
        >
          <Icon size={22} color={call.status === 'open' ? theme.error : theme.text} />
        </View>
        <View style={styles.flex}>
          <Text variant="body-strong">{t(`waiter.reasons.${call.reason}`)}</Text>
          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
            {meta.join(' · ')}
          </Text>
        </View>
        <StatusPill
          label={t(`ownerCalls.status.${call.status}`)}
          tone={STATUS_TONE[call.status]}
          boxed
        />
      </View>
      {call.note ? (
        <Text variant="body" style={[styles.note, { backgroundColor: theme.wash }]}>
          {call.note}
        </Text>
      ) : null}
      {live ? (
        <View style={styles.actions}>
          {call.status === 'open' ? (
            <Button
              label={t('owner.onTheWay')}
              size="md"
              tone="primary"
              style={styles.flex}
              loading={busy}
              onPress={onAcknowledge}
            />
          ) : null}
          <Button
            label={t('owner.doneCall')}
            size="md"
            tone="primary"
            style={styles.flex}
            disabled={busy}
            onPress={onResolve}
          />
        </View>
      ) : null}
    </View>
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
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  icon: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  note: {
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.md,
  },
  actions: { flexDirection: 'row', gap: tokens.space[2] },
});

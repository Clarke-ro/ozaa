import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { REASON_ICON } from '@/features/waiter';
import type { WaiterCall } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerLayout } from '../../chrome/layout';
import { ticketAge } from '../../desk/ops';
import { StatusPill, type PillTone } from '../../kit';

const STATUS_TONE: Record<WaiterCall['status'], PillTone> = {
  open: 'error',
  acknowledged: 'waiting',
  resolved: 'success',
};

/**
 * One guest call as a flat row: what they need, which table, how long they have waited, and the
 * next step. A red edge marks a call nobody has picked up yet. The buttons are outlined, never
 * filled, so the screen's one filled button stays the header action.
 */
export function CallRow({
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
  const { wide } = useOwnerLayout();
  const Icon = REASON_ICON[call.reason];
  const open = call.status === 'open';
  const live = call.status !== 'resolved';
  const age = ticketAge(call.createdAt, now);
  const time = new Date(call.createdAt).toLocaleTimeString(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const detail = [
    t('ownerOrders.table', { code: call.tableCode }),
    live ? t('ownerCalls.waited', { count: age.minutes }) : time,
    call.staffFirstName ? t('ownerCalls.by', { name: call.staffFirstName }) : null,
  ].filter(Boolean);
  const edge = open ? theme.error : live ? theme.meta : null;
  const doneLabel = t('owner.doneCall');

  const actions = live ? (
    <View style={[styles.actions, wide && styles.actionsWide]}>
      {open ? (
        <Button
          label={t('owner.onTheWay')}
          size="md"
          tone="secondary"
          style={!wide && styles.grow}
          loading={busy}
          onPress={onAcknowledge}
        />
      ) : null}
      <Button
        label={doneLabel}
        size="md"
        // With "On my way" beside it, Done is the quieter choice; alone it gets the outline.
        tone={open ? 'ghost' : 'secondary'}
        style={!wide && styles.grow}
        disabled={busy}
        onPress={onResolve}
      />
    </View>
  ) : null;

  return (
    <View style={[styles.row, { backgroundColor: theme.surface }]}>
      {edge ? <View style={[styles.edge, { backgroundColor: edge }]} /> : null}
      <View style={[styles.main, wide && styles.mainWide]}>
        <View style={styles.head}>
          <View style={[styles.icon, { backgroundColor: open ? theme.errorTint : theme.wash }]}>
            <Icon size={20} color={open ? theme.error : theme.text} />
          </View>
          <View style={styles.copy}>
            <Text variant="body-strong" numberOfLines={1}>
              {t(`waiter.reasons.${call.reason}`)}
            </Text>
            <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
              {detail.join(' · ')}
            </Text>
            {call.note ? (
              <Text variant="body" style={{ color: theme.muted }}>
                {call.note}
              </Text>
            ) : null}
          </View>
          <StatusPill
            label={t(`ownerCalls.status.${call.status}`)}
            tone={STATUS_TONE[call.status]}
            boxed
          />
        </View>
        {actions}
      </View>
    </View>
  );
}

const ICON = tokens.space[10];

const styles = StyleSheet.create({
  row: {
    minHeight: tokens.touchTarget + tokens.space[4],
    paddingLeft: tokens.space[4] + tokens.owner.statusEdge,
    paddingRight: tokens.space[3],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  // Drawn as its own strip so the rounded corners clip it cleanly on every platform.
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: tokens.owner.statusEdge },
  main: { gap: tokens.space[3] },
  mainWide: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[4] },
  head: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: tokens.radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: tokens.space[1] / 2 },
  actions: { flexDirection: 'row', gap: tokens.space[2] },
  actionsWide: { flexShrink: 0 },
  grow: { flex: 1 },
});

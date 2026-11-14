import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AlarmClock, ChevronRight, MessageSquare, MessageSquareText } from 'lucide-react-native';
import type { WaiterCall } from '@/lib/api/types';
import { STATUS_TONES, type StatusTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { ticketAge } from '../../desk/ops';
import { cardStyle } from '../../kit';
import { waitedLabel } from '../orders/orderPlace';

/** The colour of what a guest asked for (canvas): a bill amber, ordering more orange, the rest red. */
function reasonTone(call: WaiterCall): StatusTone {
  if (call.status === 'acknowledged') return 'info';
  if (call.reason === 'bill') return 'bill';
  if (call.reason === 'order_more') return 'order';
  return 'alert';
}

/**
 * One guest call as a card (design canvas): "Table 4 ›" opens the call, the wait on the right
 * (red once late), what they asked for in its colour, who is on it, then the actions. Waiting
 * calls get a tinted "On my way" with "Done" beside it, plus Reply and Snooze under a line;
 * calls someone is on get one green "Done".
 */
export function CallCard({
  call,
  now,
  busy,
  onAcknowledge,
  onResolve,
  onSnooze,
}: {
  call: WaiterCall;
  now: number;
  busy: boolean;
  onAcknowledge: () => void;
  onResolve: () => void;
  onSnooze: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const tones = STATUS_TONES[theme.scheme];
  const open = call.status === 'open';
  const age = ticketAge(call.createdAt, now);
  const late = age.tone !== 'ok';
  const tone = tones[reasonTone(call)];
  const openCall = () => router.push(`/owner/calls/${call.id}`);
  // A bill call opens the table's bill on the Floor; anything else is "On my way" (or "Take order").
  const isBill = call.reason === 'bill';
  const mainLabel = isBill
    ? t('ownerCalls.openBill')
    : call.reason === 'order_more'
      ? t('ownerCalls.orderMoreAction')
      : t('owner.onTheWay');
  const onMain = isBill
    ? () => router.push(`/owner/floor?table=${encodeURIComponent(call.tableCode)}`)
    : onAcknowledge;
  const who = call.reply
    ? t('ownerCalls.replied', { name: call.staffFirstName ?? '', reply: call.reply })
    : call.staffFirstName
      ? t('ownerCalls.by', { name: call.staffFirstName })
      : null;

  return (
    <View
      style={[
        cardStyle(theme),
        styles.card,
        // A late call gets a red edge as well as red minutes, so it stands out on a full board.
        open && late && { borderColor: tones.alert.line, borderWidth: 1.5 },
      ]}
    >
      <View style={styles.head}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('ownerCalls.openA11y', {
            table: call.tableCode,
            reason: t(`waiter.reasons.${call.reason}`),
          })}
          onPress={openCall}
          style={({ pressed }) => [styles.title, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.table} numberOfLines={1}>
            {t('ownerOrders.table', { code: call.tableCode })}
          </Text>
          <ChevronRight size={18} color={theme.text} />
        </Pressable>
        {/* A message from the guest: an icon with a red dot, opening the call to read it. */}
        {call.note ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t('ownerCalls.hasMessage')}
            onPress={openCall}
            style={styles.msg}
          >
            <MessageSquareText size={20} color={theme.text} />
            <View
              style={[
                styles.dot,
                { backgroundColor: tones.alert.line, borderColor: theme.surface },
              ]}
            />
          </Pressable>
        ) : null}
        <Text
          accessibilityLabel={t('ownerOrders.waitedLabel', { count: age.minutes })}
          style={[
            styles.sub,
            late
              ? { color: tones.alert.line, fontFamily: fontFamily.strong }
              : { color: theme.meta },
          ]}
        >
          {waitedLabel(age.minutes, t)}
        </Text>
      </View>

      <View style={styles.what}>
        <Text style={[styles.reason, { color: tone.line }]} numberOfLines={1}>
          {t(`ownerCalls.reasonShort.${call.reason}`)}
        </Text>
        {who ? (
          <Text style={[styles.sub, { color: theme.meta }]} numberOfLines={1}>
            {who}
          </Text>
        ) : null}
      </View>

      {open ? (
        <>
          <View style={styles.actions}>
            <Button
              label={mainLabel}
              tone="tinted"
              tint={reasonTone(call)}
              loading={busy}
              onPress={onMain}
              style={[styles.grow, styles.short]}
            />
            <Button
              label={t('owner.doneCall')}
              tone="secondary"
              disabled={busy}
              onPress={onResolve}
              style={styles.short}
            />
          </View>
          <View style={[styles.foot, { borderTopColor: theme.wash }]}>
            <Pressable
              accessibilityRole="button"
              onPress={openCall}
              style={({ pressed }) => [styles.link, pressed && { backgroundColor: theme.wash }]}
            >
              <MessageSquare size={16} color={theme.muted} />
              <Text style={[styles.sub, { color: theme.muted }]}>
                {t('ownerCalls.detail.reply')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onSnooze}
              style={({ pressed }) => [styles.link, pressed && { backgroundColor: theme.wash }]}
            >
              <AlarmClock size={16} color={theme.muted} />
              <Text style={[styles.sub, { color: theme.muted }]}>
                {t('ownerCalls.detail.snooze')}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Button
          label={t('owner.doneCall')}
          tone="tinted"
          tint="success"
          loading={busy}
          onPress={onResolve}
          style={styles.short}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, padding: tokens.owner.controls.cardPadding, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  title: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 },
  table: { flexShrink: 1, fontSize: 17, lineHeight: 22, fontFamily: fontFamily.strong },
  msg: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
  },
  what: { gap: 2 },
  reason: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.strong },
  sub: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: tokens.space[2], marginTop: 'auto' },
  grow: { flex: 1 },
  short: { minHeight: 44 },
  foot: { flexDirection: 'row', gap: 4, paddingTop: 10, borderTopWidth: 1 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: tokens.radius.full,
  },
});

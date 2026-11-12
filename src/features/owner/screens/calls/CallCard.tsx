import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Clock, MessageSquareText } from 'lucide-react-native';
import { REASON_ICON } from '@/features/waiter';
import type { WaiterCall } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ticketAge } from '../../desk/ops';
import { cardStyle, CodeTile, StatusPill } from '../../kit';
import { AGE_TONE, waitedLabel } from '../orders/orderPlace';

/**
 * One guest call as a card on the board: the table in big type, what they asked for, any note,
 * how long they have waited (amber after 10 minutes, red after 20) and who is on it. "On my way"
 * and "Done" are outlined, never filled: the board has no single most important call.
 */
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
  const open = call.status === 'open';
  const live = call.status !== 'resolved';
  const age = ticketAge(call.createdAt, now);
  const time = new Date(call.createdAt).toLocaleTimeString(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const late = live && age.tone !== 'ok';
  const router = useRouter();

  return (
    <View
      style={[cardStyle(theme), styles.card, open && { borderColor: theme.error, borderWidth: 1 }]}
    >
      {/* The top of the card opens the call's own page: the full message, replies and history. */}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t('ownerCalls.openA11y', {
          table: call.tableCode,
          reason: t(`waiter.reasons.${call.reason}`),
        })}
        onPress={() => router.push(`/owner/calls/${call.id}`)}
        style={({ pressed }) => [styles.head, pressed && { opacity: 0.7 }]}
      >
        <CodeTile code={call.tableCode} size={tokens.touchTarget} tone={open ? 'alert' : 'wash'} />
        <View style={styles.words}>
          <Text variant="body-strong" numberOfLines={1}>
            {t('ownerOrders.table', { code: call.tableCode })}
          </Text>
          <View style={styles.reason}>
            <Icon size={14} color={theme.muted} />
            <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
              {t(`waiter.reasons.${call.reason}`)}
            </Text>
          </View>
        </View>
        {live ? (
          <View accessibilityLabel={t('ownerOrders.waitedLabel', { count: age.minutes })}>
            <StatusPill
              label={waitedLabel(age.minutes, t)}
              tone={late ? AGE_TONE[age.tone] : 'neutral'}
              boxed
            />
          </View>
        ) : (
          <View style={styles.time}>
            <Clock size={14} color={theme.meta} />
            <Text variant="caption" style={{ color: theme.meta }}>
              {time}
            </Text>
          </View>
        )}
        {/* A message from the guest shows as an icon with a dot, so every card stays the same size. */}
        {call.note ? (
          <View accessibilityLabel={t('ownerCalls.hasMessage')}>
            <MessageSquareText size={18} color={theme.text} />
            <View style={[styles.msgDot, { backgroundColor: theme.error }]} />
          </View>
        ) : null}
        <ChevronRight size={18} color={theme.meta} />
      </Pressable>

      {call.reply ? (
        <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
          {t('ownerCalls.replied', { name: call.staffFirstName ?? '', reply: call.reply })}
        </Text>
      ) : call.staffFirstName ? (
        <Text variant="caption" style={{ color: theme.muted }}>
          {t('ownerCalls.by', { name: call.staffFirstName })}
        </Text>
      ) : null}

      {live ? (
        <View style={styles.actions}>
          {open ? (
            <Button
              label={t('owner.onTheWay')}
              size="md"
              tone="secondary"
              loading={busy}
              onPress={onAcknowledge}
            />
          ) : null}
          <Button
            label={t('owner.doneCall')}
            size="md"
            // With "On my way" beside it, Done is the quieter choice; alone it gets the outline.
            tone={open ? 'ghost' : 'secondary'}
            disabled={busy}
            onPress={onResolve}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  msgDot: { position: 'absolute', top: -2, right: -3, width: 8, height: 8, borderRadius: 4 },
  card: { padding: tokens.space[4], gap: tokens.space[3] },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  words: { flex: 1, minWidth: 0, gap: 2 },
  reason: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  time: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
});

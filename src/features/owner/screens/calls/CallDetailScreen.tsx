import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BellOff, MessageSquareText } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { WaiterCallUpdate } from '@/lib/api/client';
import { useOwnerSession } from '@/features/session';
import { STATUS_TONES } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { ticketAge } from '../../desk/ops';
import { cardStyle, EmptyCard, SectionLabel, toast } from '../../kit';
import { waitedLabel } from '../orders/orderPlace';
import { useWaiterCalls } from './useWaiterCalls';
import { quickReplies } from './quickReplies';
import { callTimes } from './callBoard';
import { SectionHead } from '../dashboard/SectionHead';

// The words the Floor screen already uses for each table state.
const FLOOR_WORD = {
  free: 'free',
  seated: 'seated',
  ordered: 'ordered',
  waiting_to_pay: 'waitingPay',
  needs_waiter: 'needsWaiter',
} as const;

/**
 * One waiter call: the table, then the details (the guest's message first), the replies the guest
 * sees on their phone, and the table's other calls today. A reply finishes the call; a snooze
 * only hides it from the queue for a minute.
 */
export function CallDetailScreen({ callId }: { callId: string }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const { calls } = useWaiterCalls(venueId);
  const floor = useQuery({
    queryKey: ownerKeys.floor(venueId),
    queryFn: () => api.ownerGetFloor(venueId),
    enabled: Boolean(venueId),
  });
  const call = calls.data?.items.find((item) => item.id === callId);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/owner/calls'));
  const update = useMutation({
    mutationFn: (body: WaiterCallUpdate) => api.ownerUpdateWaiterCall(callId, body),
    onSuccess: (_saved, body) => {
      // Every list that shows this call or its table moves together.
      for (const key of [
        ownerKeys.calls(venueId),
        ownerKeys.floor(venueId),
        ownerKeys.dashboard(venueId),
        ownerKeys.notifications(venueId),
      ])
        void client.invalidateQueries({ queryKey: key });
      if (body.reply || body.status === 'resolved') back();
      else if (body.snoozeMinutes) toast.success(t('ownerCalls.snoozed'));
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  const reason = call ? t(`waiter.reasons.${call.reason}`) : '';
  const live = call ? call.status !== 'resolved' : false;
  const minutes = call ? ticketAge(call.createdAt, calls.dataUpdatedAt).minutes : 0;
  const table = floor.data?.items.find((item) => item.code === call?.tableCode);
  const earlier = (calls.data?.items ?? []).filter(
    (item) => item.tableCode === call?.tableCode && item.id !== callId,
  );

  return (
    <OwnerPage
      title={call ? t('ownerCalls.detail.title', { table: call.tableCode }) : t('owner.calls')}
      subtitle={
        call
          ? live
            ? t('ownerCalls.detail.lead', { reason, minutes: waitedLabel(minutes, t) })
            : t('ownerCalls.detail.leadDone', { reason })
          : undefined
      }
      back={{ label: t('ownerCalls.detail.back'), onPress: back }}
    >
      <DeskWait
        loading={calls.isLoading}
        error={calls.isError}
        onRetry={() => void calls.refetch()}
      >
        {!call ? (
          <EmptyCard
            icon={BellOff}
            title={t('ownerCalls.detail.gone')}
            description={t('ownerCalls.detail.goneBody')}
            actionLabel={t('ownerCalls.detail.back')}
            onAction={back}
          />
        ) : (
          <View style={styles.stack}>
            <View style={styles.group}>
              <SectionLabel title={t('ownerCalls.detail.details')} />
              <View style={cardStyle(theme)}>
                {call.note ? (
                  <View style={[styles.message, { borderBottomColor: theme.line }]}>
                    <MessageSquareText size={22} color={theme.text} />
                    <View style={styles.flex}>
                      <Text variant="caption" style={{ color: theme.muted }}>
                        {t('ownerCalls.detail.message')}
                      </Text>
                      <Text variant="body">{call.note}</Text>
                    </View>
                  </View>
                ) : null}
                <Row
                  label={t('ownerCalls.detail.reason')}
                  value={reason}
                  ink={
                    STATUS_TONES[theme.scheme][
                      call.reason === 'bill'
                        ? 'bill'
                        : call.reason === 'order_more'
                          ? 'order'
                          : 'alert'
                    ].line
                  }
                />
                <Row label={t('ownerCalls.detail.askedAt')} value={time(call.createdAt)} />
                <Row
                  label={t('ownerCalls.detail.waiter')}
                  value={call.staffFirstName ?? t('ownerCalls.detail.nobody')}
                />
                <Row
                  label={t('ownerCalls.detail.table')}
                  value={table ? t(`owner.${FLOOR_WORD[table.status]}`) : '—'}
                  last
                />
              </View>
            </View>

            {live ? (
              <View style={styles.group}>
                <SectionLabel title={t('ownerCalls.detail.reply')} />
                <View style={styles.replies}>
                  {call.status === 'open' ? (
                    <Button
                      label={t('ownerCalls.detail.onMyWay')}
                      tone="tinted"
                      tint="alert"
                      disabled={update.isPending}
                      onPress={() => update.mutate({ status: 'acknowledged' })}
                      style={styles.pill}
                    />
                  ) : null}
                  {quickReplies(call.reason).map((key) => (
                    <Button
                      key={key}
                      label={t(`ownerCalls.quick.${key}`)}
                      tone="secondary"
                      disabled={update.isPending}
                      onPress={() => update.mutate({ reply: t(`ownerCalls.quick.${key}`) })}
                      style={styles.pill}
                    />
                  ))}
                  <View style={[styles.rule, { backgroundColor: theme.line }]} />
                  <Button
                    label={t('ownerCalls.detail.snooze')}
                    tone="ghost"
                    disabled={update.isPending}
                    onPress={() => update.mutate({ snoozeMinutes: 1 })}
                  />
                </View>
                <Text variant="caption" style={{ color: theme.muted }}>
                  {t('ownerCalls.detail.replyNote')}
                </Text>
              </View>
            ) : call.reply ? (
              <View style={styles.group}>
                <SectionLabel title={t('ownerCalls.detail.reply')} />
                <Text variant="body">
                  {t('ownerCalls.replied', { name: call.staffFirstName ?? '', reply: call.reply })}
                </Text>
              </View>
            ) : null}

            <View style={styles.group}>
              <SectionHead
                title={t('ownerCalls.detail.earlier', { table: call.tableCode })}
                badge={earlier.length > 0 ? String(earlier.length) : undefined}
              />
              {earlier.length === 0 ? (
                <Text variant="body" style={{ color: theme.muted }}>
                  {t('ownerCalls.detail.noEarlier')}
                </Text>
              ) : (
                earlier.map((item) => {
                  const took = callTimes(item).pickedUp;
                  return (
                    <View key={item.id} style={[cardStyle(theme), styles.earlier]}>
                      <Text style={[styles.time, { color: theme.meta }]}>
                        {time(item.createdAt)}
                      </Text>
                      <Text variant="body" style={styles.flex} numberOfLines={1}>
                        {t(`waiter.reasons.${item.reason}`)}
                      </Text>
                      <Text style={[styles.time, { color: theme.meta }]}>
                        {took != null
                          ? item.staffFirstName
                            ? t('ownerCalls.pickedUpBy', { count: took, name: item.staffFirstName })
                            : t('ownerCalls.pickedUp', { count: took })
                          : t(`ownerCalls.status.${item.status}`)}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}
      </DeskWait>
    </OwnerPage>
  );
}

function Row({
  label,
  value,
  last,
  ink,
}: {
  label: string;
  value: string;
  last?: boolean;
  /** Colours the value, e.g. the reason in its call colour (canvas). */
  ink?: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: theme.wash }]}>
      <Text variant="body" style={[styles.flex, { color: theme.muted }]}>
        {label}
      </Text>
      <Text
        variant={ink ? 'body-strong' : 'body'}
        numberOfLines={1}
        style={ink ? { color: ink } : undefined}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Canvas: 40 px between sections, 20 px under each heading.
  stack: { gap: tokens.space[10] },
  group: { gap: tokens.owner.controls.headGap },
  pill: { minHeight: 40 },
  flex: { flex: 1, minWidth: 0 },
  message: {
    flexDirection: 'row',
    gap: tokens.space[3],
    padding: tokens.space[5],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 56,
    paddingHorizontal: tokens.space[3],
  },
  replies: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.space[2] },
  rule: { width: StyleSheet.hairlineWidth, height: 28, marginHorizontal: tokens.space[1] },
  earlier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 52,
    paddingHorizontal: tokens.space[3],
  },
  time: { fontSize: 13, lineHeight: 18 },
});

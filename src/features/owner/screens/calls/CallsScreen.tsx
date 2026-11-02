import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BellOff, Timer } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { WaiterCall } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { averageResponseMinutes } from '../../desk/ops';
import { CodeTile, DeskTabs, EmptyCard, StatusPill, toast } from '../../kit';

type Tab = 'active' | 'history';

/** Guests asking for a waiter. "On my way" tells the guest someone is coming; "Done" closes the call. */
export function CallsScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [tab, setTab] = useState<Tab>('active');
  const key = ownerKeys.calls(venueId);
  const calls = useQuery({
    queryKey: key,
    queryFn: () => api.ownerListWaiterCalls(venueId),
    enabled: Boolean(venueId),
    refetchInterval: 5000,
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'acknowledged' | 'resolved' }) =>
      api.ownerUpdateWaiterCall(id, { status }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: key });
      void client.invalidateQueries({ queryKey: ownerKeys.floor(venueId) });
      void client.invalidateQueries({ queryKey: ownerKeys.dashboard(venueId) });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  const all = [...(calls.data?.items ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const active = all.filter((c) => c.status !== 'resolved').reverse();
  const shown = tab === 'active' ? active : all.filter((c) => c.status === 'resolved');
  const avg = averageResponseMinutes(all);
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  const card = (call: WaiterCall) => {
    const busy = update.isPending && update.variables?.id === call.id;
    return (
      <View
        key={call.id}
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: call.status === 'open' ? theme.error : theme.line,
          },
        ]}
      >
        <View style={styles.head}>
          <CodeTile
            code={`T${call.tableCode}`}
            size={44}
            tone={call.status === 'open' ? 'alert' : 'wash'}
          />
          <View style={styles.flex}>
            <Text variant="title">{t(`waiter.reasons.${call.reason}`)}</Text>
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('ownerOrders.table', { code: call.tableCode })} · {time(call.createdAt)}
              {call.staffFirstName ? ` · ${call.staffFirstName}` : ''}
            </Text>
          </View>
          <StatusPill
            label={t(`ownerCalls.status.${call.status}`)}
            tone={
              call.status === 'open'
                ? 'error'
                : call.status === 'acknowledged'
                  ? 'waiting'
                  : 'success'
            }
            boxed
          />
        </View>
        {call.note ? <Text variant="body">{call.note}</Text> : null}
        {call.status === 'resolved' ? null : (
          <View style={styles.actions}>
            {call.status === 'open' ? (
              <Button
                label={t('owner.onTheWay')}
                size="md"
                tone="secondary"
                style={styles.flex}
                loading={busy}
                onPress={() => update.mutate({ id: call.id, status: 'acknowledged' })}
              />
            ) : null}
            <Button
              label={t('owner.doneCall')}
              size="md"
              tone="ghost"
              style={styles.flex}
              disabled={busy}
              onPress={() => update.mutate({ id: call.id, status: 'resolved' })}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <OwnerPage title={t('owner.calls')}>
      {avg != null ? (
        <View
          style={styles.avg}
          accessible
          accessibilityLabel={t('ownerCalls.avgA11y', { count: avg })}
        >
          <Timer size={18} color={theme.muted} />
          <Text variant="body" style={{ color: theme.muted }}>
            {t('ownerCalls.avg', { count: avg })}
          </Text>
        </View>
      ) : null}
      <DeskTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'active', label: t('ownerCalls.active'), count: active.length },
          { id: 'history', label: t('ownerCalls.history') },
        ]}
      />
      <DeskWait
        loading={calls.isLoading}
        error={calls.isError}
        onRetry={() => void calls.refetch()}
      >
        {shown.length === 0 ? (
          <EmptyCard
            icon={BellOff}
            title={tab === 'active' ? t('owner.noCalls') : t('ownerCalls.noHistory')}
            description={t('ownerCalls.emptyBody')}
          />
        ) : (
          <View style={styles.list}>{shown.map(card)}</View>
        )}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  avg: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  list: { gap: tokens.space[3] },
  card: {
    gap: tokens.space[3],
    padding: tokens.space[4],
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: tokens.space[2] },
});

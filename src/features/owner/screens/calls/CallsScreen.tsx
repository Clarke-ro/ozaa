import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BellOff } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { averageResponseMinutes } from '../../desk/ops';
import { DeskTabs, EmptyCard, toast } from '../../kit';
import { SummaryStrip } from '../../kit/SummaryStrip';
import { CallCard } from './CallCard';

type Tab = 'active' | 'history';

// Waits only need to move once every half minute.
const TICK_MS = 30_000;

/** Guests asking for a waiter. "On my way" tells the guest someone is coming; "Done" closes the call. */
export function CallsScreen() {
  const { t } = useTranslation();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [tab, setTab] = useState<Tab>('active');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
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
  // Oldest waiting call first: that guest has waited longest.
  const active = all.filter((c) => c.status !== 'resolved').reverse();
  const shown = tab === 'active' ? active : all.filter((c) => c.status === 'resolved');
  const waiting = active.filter((c) => c.status === 'open').length;
  const avg = averageResponseMinutes(all);

  return (
    <OwnerPage title={t('owner.calls')}>
      <SummaryStrip
        items={[
          {
            label: t('ownerCalls.status.open'),
            value: String(waiting),
            tone: waiting > 0 ? 'alert' : undefined,
          },
          { label: t('ownerCalls.status.acknowledged'), value: String(active.length - waiting) },
          {
            label: t('ownerCalls.avgShort'),
            value: avg == null ? '–' : t('ownerCalls.minutes', { count: avg }),
          },
        ]}
      />
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
          <View style={styles.list}>
            {shown.map((call) => (
              <CallCard
                key={call.id}
                call={call}
                now={now}
                busy={update.isPending && update.variables?.id === call.id}
                onAcknowledge={() => update.mutate({ id: call.id, status: 'acknowledged' })}
                onResolve={() => update.mutate({ id: call.id, status: 'resolved' })}
              />
            ))}
          </View>
        )}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({ list: { gap: tokens.space[3] } });

import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BellOff, BellRing, Footprints, Timer } from 'lucide-react-native';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { useOwnerLayout } from '../../chrome/layout';
import { averageResponseMinutes } from '../../desk/ops';
import { DeskTabs, EmptyCard, MetricStrip } from '../../kit';
import { CallRow } from './CallRow';
import { useWaiterCalls } from './useWaiterCalls';

type Tab = 'active' | 'history';

// Waits only need to move once every half minute.
const TICK_MS = 30_000;
// Past this text size three numbers no longer fit side by side on a phone, so they stack.
const STACK_AT = 1.3;

/** Guests asking for a waiter. "On my way" tells the guest someone is coming; "Done" closes the call. */
export function CallsScreen() {
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const { wide } = useOwnerLayout();
  const { fontScale } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('active');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  const { calls, update } = useWaiterCalls(venueId);

  const all = [...(calls.data?.items ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Oldest waiting call first: that guest has waited longest.
  const active = all.filter((c) => c.status !== 'resolved').reverse();
  const shown = tab === 'active' ? active : all.filter((c) => c.status === 'resolved');
  const waiting = active.filter((c) => c.status === 'open').length;
  const avg = averageResponseMinutes(all);

  return (
    <OwnerPage title={t('owner.calls')} subtitle={t('ownerLead.calls')} width="wide">
      <MetricStrip
        columns={wide || fontScale <= STACK_AT ? 3 : 1}
        metrics={[
          {
            key: 'waiting',
            label: t('ownerCalls.status.open'),
            value: String(waiting),
            icon: BellRing,
            alert: waiting > 0,
            note: waiting > 0 ? t('ownerCalls.answerSoon') : undefined,
          },
          {
            key: 'coming',
            label: t('ownerCalls.status.acknowledged'),
            value: String(active.length - waiting),
            icon: Footprints,
          },
          {
            key: 'avg',
            label: t('ownerCalls.avgShort'),
            value: avg == null ? '–' : t('ownerCalls.minutes', { count: avg }),
            icon: Timer,
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
              <CallRow
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

const styles = StyleSheet.create({ list: { gap: tokens.space[2] } });

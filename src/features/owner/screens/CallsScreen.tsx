import { makeStyles } from '@/ui/makeStyles';
import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { UserCheck } from 'lucide-react-native';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { CodeTile, DeskCard, DeskTabs, StatTile, StatusPill } from '../kit';

type CallsTab = 'active' | 'all';

export function CallsScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();

  const [tab, setTab] = useState<CallsTab>('active');

  const calls = useQuery({
    queryKey: ['owner-calls', venueId],
    queryFn: () => api.ownerListWaiterCalls(venueId),
    enabled: Boolean(venueId),
    refetchInterval: 5000,
  });

  const save = useMutation({
    mutationFn: (input: { id: string; status: 'acknowledged' | 'resolved' }) =>
      api.ownerUpdateWaiterCall(input.id, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['owner-calls', venueId] });
      void client.invalidateQueries({ queryKey: ['owner-floor', venueId] });
      void client.invalidateQueries({ queryKey: ['owner-dashboard', venueId] });
    },
  });

  const allItems = calls.data?.items ?? [];
  const openCalls = allItems.filter((call) => call.status !== 'resolved');
  const ackCalls = allItems.filter((call) => call.status === 'acknowledged');

  const filteredCalls = tab === 'active' ? openCalls : allItems;

  const tabs = [
    { id: 'active' as const, label: 'Active calls', count: openCalls.length },
    { id: 'all' as const, label: 'All history', count: allItems.length },
  ];

  return (
    <OwnerPage title={t('owner.calls')}>
      <DeskWait
        loading={calls.isLoading}
        error={calls.isError}
        onRetry={() => void calls.refetch()}
      >
        <View style={styles.stack}>
          {/* Top Response Time Metrics */}
          <View style={styles.metricsRow}>
            <StatTile label="Open requests" value={String(openCalls.length)} />
            <StatTile label="In progress" value={String(ackCalls.length)} />
            <StatTile label="Avg response" value="< 3m" />
          </View>

          <DeskTabs tabs={tabs} value={tab} onChange={setTab} />

          {filteredCalls.length === 0 ? (
            <Text variant="body" style={{ color: theme.muted, paddingVertical: tokens.space[4] }}>
              {t('owner.noCalls')}
            </Text>
          ) : null}

          {filteredCalls.map((call) => {
            const isOpen = call.status === 'open';
            const isAck = call.status === 'acknowledged';
            const isResolved = call.status === 'resolved';

            return (
              <DeskCard
                key={call.id}
                tone={isOpen ? 'alert' : isAck ? 'selected' : 'plain'}
                style={styles.callCard}
              >
                <View style={styles.callHeader}>
                  <CodeTile
                    code={`T${call.tableCode}`}
                    size={48}
                    tone={isOpen ? 'alert' : 'wash'}
                  />

                  <View style={styles.callDetails}>
                    <Text variant="title">{t('home.table', { code: call.tableCode })}</Text>
                    <Text variant="body-strong" style={{ color: theme.text }}>
                      {t(`waiter.reasons.${call.reason}`)}
                    </Text>
                    {call.note ? (
                      <Text variant="caption" style={{ color: theme.meta }}>
                        &ldquo;{call.note}&rdquo;
                      </Text>
                    ) : null}
                  </View>

                  <StatusPill
                    label={isOpen ? 'Waiting' : isAck ? 'Staff on way' : 'Resolved'}
                    tone={isOpen ? 'error' : isAck ? 'accent' : 'success'}
                    boxed
                    icon={true}
                  />
                </View>

                {call.status === 'acknowledged' && call.staffFirstName ? (
                  <View style={[styles.staffAssigned, { backgroundColor: theme.tint }]}>
                    <UserCheck size={16} color={theme.ink} />
                    <Text variant="caption" style={{ color: theme.ink }}>
                      {t('waiter.onTheWay', { name: call.staffFirstName })}
                    </Text>
                  </View>
                ) : null}

                {/* Action Buttons */}
                {!isResolved ? (
                  <View style={styles.actionsRow}>
                    {isOpen ? (
                      <Button
                        label={t('owner.onTheWay')}
                        tone="primary"
                        onPress={() => save.mutate({ id: call.id, status: 'acknowledged' })}
                        loading={save.isPending}
                        style={{ flex: 1 }}
                      />
                    ) : null}

                    <Button
                      label={t('owner.doneCall')}
                      tone={isOpen ? 'ghost' : 'secondary'}
                      onPress={() => save.mutate({ id: call.id, status: 'resolved' })}
                      loading={save.isPending}
                      style={isAck ? { flex: 1 } : undefined}
                    />
                  </View>
                ) : null}
              </DeskCard>
            );
          })}
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

const useStyles = makeStyles((theme) => ({
  stack: { gap: tokens.space[4] },
  metricsRow: {
    flexDirection: 'row',
    gap: tokens.space[3],
  },
  callCard: {
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  callHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  callDetails: {
    flex: 1,
    gap: 2,
  },
  staffAssigned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
    paddingTop: tokens.space[2],
    borderTopWidth: 1,
    borderTopColor: theme.line,
  },
}));

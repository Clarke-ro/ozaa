import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { useOwnerLayout } from '../../chrome/layout';
import { averageResponseMinutes, ticketAge } from '../../desk/ops';
import { CardGrid, ChipRow } from '../../kit';
import { CALL_COLUMNS, callBoard, topReason, type CallColumn } from './callBoard';
import { CallCard } from './CallCard';
import { CallDoneRow } from './CallDoneRow';
import { CallFigures } from './CallFigures';
import { QuickReplyStrip } from './QuickReplyStrip';
import { ReasonCounts } from './ReasonCounts';
import { useWaiterCalls } from './useWaiterCalls';
import { useNow } from '@/lib/useNow';

// Waits only need to move once every half minute.
const TICK_MS = 30_000;
// Done keeps only the latest few; older ones stay in the counts and the average.
const DONE_SHOWN = 8;

/**
 * Guests asking for a waiter (design canvas): four numbers on top, then chips for Waiting, On the
 * way and Done. Waiting and On the way are grids of call cards, three across on a desktop;
 * Done is a list of rows saying how fast each call went. "On my way" tells the guest someone
 * is coming; "Done" closes the call; "Snooze 1 min" brings it back in a minute.
 */
export function CallsScreen() {
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const { wide, desktop } = useOwnerLayout();
  const [tab, setTab] = useState<CallColumn>('open');
  const now = useNow(TICK_MS);
  const { calls, update } = useWaiterCalls(venueId);
  const all = calls.data?.items ?? [];
  const board = callBoard(all);
  const busyId = update.isPending ? (update.variables?.id ?? null) : null;
  const late = board.open.filter((c) => ticketAge(c.createdAt, now).tone !== 'ok').length;
  const shown = board[tab];

  return (
    <OwnerPage title={t('owner.calls')} subtitle={t('ownerLead.calls')}>
      <CallFigures
        waiting={board.open.length}
        late={late}
        coming={board.acknowledged.length}
        avg={averageResponseMinutes(all)}
        top={topReason(all)}
        columns={desktop ? 4 : 2}
      />
      <DeskWait
        loading={calls.isLoading}
        error={calls.isError}
        onRetry={() => void calls.refetch()}
      >
        <View style={styles.stack}>
          <ChipRow<CallColumn>
            label={t('ownerFloor.filter.label')}
            value={tab}
            onChange={setTab}
            items={CALL_COLUMNS.map((id) => ({
              id,
              label: t(`ownerCalls.status.${id}`),
              count: board[id].length,
            }))}
          />
          {shown.length === 0 ? (
            <Text variant="body" style={styles.empty}>
              {t(`ownerCalls.emptyColumn.${tab}`)}
            </Text>
          ) : tab === 'resolved' ? (
            <View style={styles.rows}>
              {shown.slice(0, DONE_SHOWN).map((call) => (
                <CallDoneRow key={call.id} call={call} />
              ))}
            </View>
          ) : (
            <CardGrid columns={desktop ? 3 : wide ? 2 : 1} gap={tokens.owner.controls.listGap}>
              {shown.map((call) => (
                <CallCard
                  key={call.id}
                  call={call}
                  now={now}
                  busy={busyId === call.id}
                  onAcknowledge={() => update.mutate({ id: call.id, status: 'acknowledged' })}
                  onResolve={() => update.mutate({ id: call.id, status: 'resolved' })}
                  onSnooze={() => update.mutate({ id: call.id, snoozeMinutes: 1 })}
                />
              ))}
            </CardGrid>
          )}
          {tab === 'open' ? <QuickReplyStrip /> : null}
        </View>
        <ReasonCounts calls={all} columns={desktop ? 6 : wide ? 3 : 2} />
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  // Canvas: 24 px above the chips beyond the page's section gap, 20 px under them.
  stack: { gap: tokens.owner.controls.headGap, marginTop: tokens.space[6] },
  rows: { gap: tokens.owner.controls.listGap },
  empty: { paddingVertical: tokens.space[4] },
});

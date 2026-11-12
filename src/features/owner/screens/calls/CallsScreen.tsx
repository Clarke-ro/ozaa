import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { useOwnerLayout } from '../../chrome/layout';
import { averageResponseMinutes } from '../../desk/ops';
import { DeskTabs } from '../../kit';
import { CALL_COLUMNS, callBoard, topReason, type CallColumn } from './callBoard';
import { CallColumnView } from './CallColumnView';
import { CallFigures } from './CallFigures';
import { useWaiterCalls } from './useWaiterCalls';

// Waits only need to move once every half minute.
const TICK_MS = 30_000;
// Done keeps only the latest few on the board; older ones stay in the counts and the average.
const DONE_SHOWN = 8;

/**
 * Guests asking for a waiter, as a board: Waiting, On the way and Done side by side on wide
 * screens, so staff see the whole room's calls at once and each one moves left to right. Phones
 * show one column at a time behind tabs. "On my way" tells the guest someone is coming; "Done"
 * closes the call.
 */
export function CallsScreen() {
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const { wide, desktop } = useOwnerLayout();
  const [tab, setTab] = useState<CallColumn>('open');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  const { calls, update } = useWaiterCalls(venueId);
  const all = calls.data?.items ?? [];
  const board = callBoard(all);
  const busyId = update.isPending ? (update.variables?.id ?? null) : null;
  const answer = (id: string, status: 'acknowledged' | 'resolved') => update.mutate({ id, status });

  const column = (id: CallColumn, showTitle: boolean) => (
    <CallColumnView
      key={id}
      column={id}
      calls={board[id]}
      now={now}
      busyId={busyId}
      limit={id === 'resolved' ? DONE_SHOWN : undefined}
      onAnswer={(call, status) => answer(call.id, status)}
      showTitle={showTitle}
    />
  );

  return (
    <OwnerPage title={t('owner.calls')} subtitle={t('ownerLead.calls')} width="wide">
      <CallFigures
        waiting={board.open.length}
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
        {wide ? (
          <View style={styles.board}>{CALL_COLUMNS.map((id) => column(id, true))}</View>
        ) : (
          <View style={styles.stack}>
            <DeskTabs
              value={tab}
              onChange={setTab}
              tabs={CALL_COLUMNS.map((id) => ({
                id,
                label: t(`ownerCalls.status.${id}`),
                count: id === 'resolved' ? undefined : board[id].length,
              }))}
            />
            {column(tab, false)}
          </View>
        )}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[4] },
  stack: { gap: tokens.space[4] },
});

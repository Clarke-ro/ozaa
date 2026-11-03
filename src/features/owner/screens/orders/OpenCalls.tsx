import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { SectionLabel } from '../../kit';
import { CallCard } from '../calls/CallCard';
import { useWaiterCalls } from '../calls/useWaiterCalls';

/**
 * Waiter calls and bill requests that are still open, on top of the Orders screen, so front-of-house
 * staff can answer a table without leaving the tickets. Hidden when nobody is waiting, and for the kitchen.
 */
export function OpenCalls({ now }: { now: number }) {
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = useOwnerSession((state) => state.role);
  const frontOfHouse = role === 'owner' || role === 'manager' || role === 'waiter';
  const { calls, update } = useWaiterCalls(frontOfHouse ? venueId : '');
  // Oldest first: that guest has waited longest.
  const open = (calls.data?.items ?? [])
    .filter((call) => call.status !== 'resolved')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (!frontOfHouse || open.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <SectionLabel title={t('ownerOrders.openCalls', { count: open.length })} caps />
      {open.map((call) => (
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
  );
}

const styles = StyleSheet.create({ wrap: { gap: tokens.space[2] } });

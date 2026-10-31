import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';

export function CallsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const calls = useQuery({
    queryKey: ['owner-calls', venueId],
    queryFn: () => api.ownerListWaiterCalls(venueId),
    enabled: Boolean(venueId),
    refetchInterval: 5000,
  });
  const save = useMutation({
    mutationFn: (input: { id: string; status: 'acknowledged' | 'resolved' }) => api.ownerUpdateWaiterCall(input.id, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['owner-calls', venueId] });
      void client.invalidateQueries({ queryKey: ['owner-floor', venueId] });
    },
  });
  const open = (calls.data?.items ?? []).filter((call) => call.status !== 'resolved');

  return (
    <OwnerPage title={t('owner.calls')}>
      <DeskWait loading={calls.isLoading} error={calls.isError} onRetry={() => void calls.refetch()}>
        {open.length === 0 ? <Text>{t('owner.noCalls')}</Text> : null}
        {open.map((call) => (
          <View key={call.id} style={[styles.card, { borderColor: theme.line }]}>
            <Text variant="title">{t('home.table', { code: call.tableCode })}</Text>
            <Text>{t(`waiter.reasons.${call.reason}`)}</Text>
            {call.note ? <Text variant="caption">{call.note}</Text> : null}
            <Text variant="caption" style={{ color: theme.meta }}>
              {call.status === 'acknowledged' ? t('waiter.onTheWay', { name: call.staffFirstName ?? '' }) : t('owner.callOpen')}
            </Text>
            {call.status === 'open' ? (
              <Button label={t('owner.onTheWay')} onPress={() => save.mutate({ id: call.id, status: 'acknowledged' })} loading={save.isPending} />
            ) : (
              <Button label={t('owner.doneCall')} tone="secondary" onPress={() => save.mutate({ id: call.id, status: 'resolved' })} loading={save.isPending} />
            )}
          </View>
        ))}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space[4], gap: tokens.space[2] },
});

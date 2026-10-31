import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { WaiterReason } from '@/lib/api/types';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useGuestSession } from '@/features/session';

const REASONS: WaiterReason[] = ['water', 'bill', 'cutlery', 'order_more', 'clean_table', 'other'];

export function WaiterScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const table = useGuestSession((state) => state.tableCode);
  const [picked, setPicked] = useState<WaiterReason[]>(['water']);
  const [callId, setCallId] = useState<string | null>(null);
  const call = useQuery({
    queryKey: ['waiter', callId],
    queryFn: () => api.getWaiterCall(callId ?? ''),
    enabled: Boolean(callId),
    refetchInterval: 3000,
  });
  const send = useMutation({
    mutationFn: (reason: WaiterReason) => api.callWaiter({ reason }, { idempotencyKey: Crypto.randomUUID() }),
    onSuccess: (row) => setCallId(row.id),
  });

  return (
    <SafeScreen>
      <PageHeader title={t('waiter.title')} subtitle={table ? t('home.table', { code: table }) : slug} />
      <View style={{ padding: 20, gap: 12 }}>
        {call.data?.status === 'acknowledged' ? (
          <>
            <Text variant="display-m">{t('waiter.onTheWay', { name: call.data.staffFirstName ?? 'Kwesi' })}</Text>
            <Text variant="body">{t('waiter.usually')}</Text>
          </>
        ) : (
          <>
            <Text variant="display-m">{t('waiter.prompt')}</Text>
            <Text variant="body" style={{ color: theme.muted }}>
              {t('waiter.lead')}
            </Text>
            <View style={styles.grid}>
              {REASONS.map((reason) => {
                const on = picked.includes(reason);
                return (
                  <Pressable
                    key={reason}
                    accessibilityRole="button"
                    onPress={() => setPicked((current) => (current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason]))}
                    style={[styles.reason, { borderColor: on ? theme.fill : theme.line, backgroundColor: on ? theme.tint : theme.white }]}
                  >
                    <Text variant="body-strong">{t(`waiter.reasons.${reason}`)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Button label={t('waiter.send')} disabled={picked.length === 0} loading={send.isPending} onPress={() => picked[0] && send.mutate(picked[0])} />
          </>
        )}
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reason: { width: '47%', minHeight: 72, borderWidth: 1, borderRadius: 16, padding: 12, justifyContent: 'center' },
});

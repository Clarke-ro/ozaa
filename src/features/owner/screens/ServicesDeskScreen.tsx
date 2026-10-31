import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { ServiceSettings } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';

function move<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const copy = items.slice();
  const current = copy[index];
  const swap = copy[target];
  if (current === undefined || swap === undefined) return items;
  copy[index] = swap;
  copy[target] = current;
  return copy;
}

export function ServicesDeskScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const services = useQuery({ queryKey: ['services', venueId], queryFn: () => api.ownerGetServices(venueId), enabled: Boolean(venueId) });
  const venue = useQuery({ queryKey: ['owner-venue', venueId], queryFn: () => api.ownerGetVenue(venueId), enabled: Boolean(venueId) });
  const [ssid, setSsid] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const saveServices = useMutation({
    mutationFn: (body: ServiceSettings) => api.ownerSetServices(venueId, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['services', venueId] }),
  });
  const saveWifi = useMutation({
    mutationFn: () =>
      api.ownerUpdateVenue(venueId, {
        wifi: { ssid: ssid ?? venue.data?.wifi?.ssid ?? '', password: password ?? venue.data?.wifi?.password ?? '', security: 'WPA' },
      }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['owner-venue', venueId] }),
  });
  const current = services.data;

  return (
    <OwnerPage title={t('owner.services')} subtitle={t('owner.serviceOrder')}>
      <DeskWait loading={services.isLoading} error={services.isError} onRetry={() => void services.refetch()}>
        {current?.services.map((service, index) => (
          <View key={service.id} style={[styles.row, { borderColor: theme.line }]}>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: service.enabled }}
              onPress={() => {
                if (!current) return;
                saveServices.mutate({
                  ...current,
                  services: current.services.map((item) => (item.id === service.id ? { ...item, enabled: !item.enabled } : item)),
                });
              }}
              style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}
            >
              <Text variant="body-strong">{t(`owner.service.${service.id}`)}</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                {service.enabled ? t('owner.on') : t('owner.off')}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('owner.up')} onPress={() => current && saveServices.mutate({ ...current, services: move(current.services, index, -1) })} style={styles.move}>
              <Text variant="caption">{t('owner.up')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('owner.down')} onPress={() => current && saveServices.mutate({ ...current, services: move(current.services, index, 1) })} style={styles.move}>
              <Text variant="caption">{t('owner.down')}</Text>
            </Pressable>
          </View>
        ))}
        <Text variant="body-strong">{t('owner.gameTarget')}</Text>
        <TextInput
          accessibilityLabel={t('owner.gameTarget')}
          value={target ?? String(current?.game.minScore ?? 15)}
          onChangeText={setTarget}
          keyboardType="number-pad"
          style={[styles.input, { borderColor: theme.line, color: theme.text }]}
        />
        <Button
          label={t('owner.save')}
          tone="secondary"
          onPress={() => {
            if (!current) return;
            const score = Number(target ?? current.game.minScore);
            const minScore = Number.isInteger(score) && score >= 1 && score <= 200 ? score : current.game.minScore;
            saveServices.mutate({ ...current, game: { ...current.game, enabled: current.game.enabled, minScore } });
          }}
        />
        <Text variant="title">{t('owner.wifiTitle')}</Text>
        <TextInput accessibilityLabel={t('owner.ssid')} value={ssid ?? venue.data?.wifi?.ssid ?? ''} onChangeText={setSsid} style={[styles.input, { borderColor: theme.line, color: theme.text }]} />
        <TextInput accessibilityLabel={t('owner.password')} value={password ?? venue.data?.wifi?.password ?? ''} onChangeText={setPassword} style={[styles.input, { borderColor: theme.line, color: theme.text }]} />
        <Button label={t('owner.saveWifi')} onPress={() => saveWifi.mutate()} loading={saveWifi.isPending} />
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2], borderBottomWidth: 1, paddingVertical: tokens.space[2] },
  move: { minHeight: 44, justifyContent: 'center', paddingHorizontal: tokens.space[2] },
  input: { borderWidth: 1, borderRadius: tokens.radius.md, minHeight: 48, paddingHorizontal: tokens.space[3] },
});

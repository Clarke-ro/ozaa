import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  BookOpen,
  Clock,
  CreditCard,
  Gamepad2,
  Gift,
  Star,
  Tag,
  Wifi,
  type LucideIcon,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import type { ServiceSettings } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { DeskCard, Field, ListRow, SectionLabel, Toggle } from '../kit';

type ServiceId =
  | 'menu'
  | 'waiter'
  | 'status'
  | 'pay'
  | 'wifi'
  | 'loyalty'
  | 'offers'
  | 'review'
  | 'play'
  | 'reserve'
  | 'events'
  | 'feedback'
  | 'about';

type ServiceGroup = {
  section: string;
  items: {
    id: ServiceId;
    title: string;
    description: string;
    icon: LucideIcon;
  }[];
};

const SERVICE_GROUPS: ServiceGroup[] = [
  {
    section: 'AT YOUR TABLE',
    items: [
      {
        id: 'menu',
        title: 'Menu',
        description: 'Food and drinks, order from your table',
        icon: BookOpen,
      },
      {
        id: 'waiter',
        title: 'Call waiter',
        description: 'Water, the bill or a hand',
        icon: Bell,
      },
      {
        id: 'status',
        title: 'Order status',
        description: 'See where your food is',
        icon: Clock,
      },
      {
        id: 'pay',
        title: 'Pay & split bill',
        description: 'MoMo or card, split any way',
        icon: CreditCard,
      },
      {
        id: 'wifi',
        title: 'Wi-Fi',
        description: 'Connect in one tap',
        icon: Wifi,
      },
    ],
  },
  {
    section: 'REWARDS',
    items: [
      {
        id: 'loyalty',
        title: 'Loyalty card',
        description: 'Collect stamps, get free food',
        icon: Gift,
      },
      {
        id: 'offers',
        title: 'Specials & offers',
        description: "Today's deals",
        icon: Tag,
      },
      {
        id: 'review',
        title: 'Leave a review',
        description: 'Write one or record a short video',
        icon: Star,
      },
    ],
  },
  {
    section: 'FUN WHILE YOU WAIT',
    items: [
      {
        id: 'play',
        title: 'Play while you wait',
        description: 'A quick game. Beat the top score here.',
        icon: Gamepad2,
      },
    ],
  },
];

export function ServicesDeskScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();

  const services = useQuery({
    queryKey: ['services', venueId],
    queryFn: () => api.ownerGetServices(venueId),
    enabled: Boolean(venueId),
  });

  const venue = useQuery({
    queryKey: ['owner-venue', venueId],
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });

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
        wifi: {
          ssid: ssid ?? venue.data?.wifi?.ssid ?? '',
          password: password ?? venue.data?.wifi?.password ?? '',
          security: 'WPA',
        },
      }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['owner-venue', venueId] }),
  });

  const current = services.data;

  const isEnabled = (id: ServiceId): boolean => {
    if (!current) return true;
    if (id === 'play') return current.game.enabled;
    const item = current.services.find((s) => s.id === id);
    return item ? item.enabled : true;
  };

  const handleToggle = (id: ServiceId, next: boolean) => {
    if (!current) return;
    if (id === 'play') {
      saveServices.mutate({
        ...current,
        game: { ...current.game, enabled: next },
      });
      return;
    }
    const updated = current.services.map((item) =>
      item.id === id ? { ...item, enabled: next } : item
    );
    saveServices.mutate({
      ...current,
      services: updated,
    });
  };

  return (
    <OwnerPage
      title={t('owner.services')}
      subtitle="Switch services on or off. Guests see them in this order, grouped like this."
    >
      <DeskWait loading={services.isLoading} error={services.isError} onRetry={() => void services.refetch()}>
        <View style={styles.stack}>
          {SERVICE_GROUPS.map((group) => (
            <View key={group.section} style={styles.group}>
              <SectionLabel title={group.section} caps={true} />
              <DeskCard style={styles.groupCard}>
                {group.items.map((item, idx) => {
                  const on = isEnabled(item.id);
                  const isLast = idx === group.items.length - 1;
                  return (
                    <ListRow
                      key={item.id}
                      title={item.title}
                      detail={item.description}
                      icon={item.icon}
                      divider={!isLast}
                      trailing={
                        <Toggle
                          value={on}
                          onChange={(next) => handleToggle(item.id, next)}
                          label={item.title}
                          disabled={saveServices.isPending}
                        />
                      }
                    />
                  );
                })}
              </DeskCard>
            </View>
          ))}

          {/* Game Stamp Target Score Stepper */}
          <View style={styles.group}>
            <SectionLabel title="GAME SETTINGS" caps={true} />
            <DeskCard style={styles.configCard}>
              <View style={styles.stepperRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body-strong">{t('owner.gameTarget')}</Text>
                  <Text variant="caption" style={{ color: theme.muted }}>
                    Guests earn 1 loyalty stamp when they hit this score in Plate Stack.
                  </Text>
                </View>
                <View style={styles.targetBox}>
                  <Field
                    label=""
                    value={target ?? String(current?.game.minScore ?? 15)}
                    onChangeText={setTarget}
                    keyboardType="number-pad"
                    style={styles.targetInput}
                  />
                </View>
              </View>
              <Button
                label={t('owner.save')}
                tone="secondary"
                onPress={() => {
                  if (!current) return;
                  const score = Number(target ?? current.game.minScore);
                  const minScore =
                    Number.isInteger(score) && score >= 1 && score <= 200
                      ? score
                      : current.game.minScore;
                  saveServices.mutate({
                    ...current,
                    game: { ...current.game, minScore },
                  });
                }}
                loading={saveServices.isPending}
              />
            </DeskCard>
          </View>

          {/* Wi-Fi Configuration Section */}
          <View style={styles.group}>
            <SectionLabel title="WI-FI CONFIGURATION" caps={true} />
            <DeskCard style={styles.configCard}>
              <Text variant="caption" style={{ color: theme.muted }}>
                Guests can connect in one tap by scanning the table QR code.
              </Text>
              <Field
                label={t('owner.ssid')}
                value={ssid ?? venue.data?.wifi?.ssid ?? ''}
                onChangeText={setSsid}
                placeholder="e.g. MamaGuestWiFi"
              />
              <Field
                label={t('owner.password')}
                value={password ?? venue.data?.wifi?.password ?? ''}
                onChangeText={setPassword}
                placeholder="WiFi password"
                secureTextEntry={false}
              />
              <Button
                label={t('owner.saveWifi')}
                onPress={() => saveWifi.mutate()}
                loading={saveWifi.isPending}
              />
            </DeskCard>
          </View>
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[5] },
  group: { gap: tokens.space[2] },
  groupCard: {
    paddingVertical: tokens.space[1],
    paddingHorizontal: tokens.space[4],
  },
  configCard: {
    gap: tokens.space[3],
    padding: tokens.space[4],
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  targetBox: {
    width: 80,
  },
  targetInput: {
    textAlign: 'center',
    fontFamily: 'Inter_600',
    fontSize: 18,
  },
});

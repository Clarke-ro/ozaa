import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { pesewas } from '@/lib/brand';
import { useOwnerSession } from '@/features/session';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ozaaTheme, ThemeProvider, useTheme } from '@/ui/theme';

export function OwnerOrders() {
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId);
  const orders = useQuery({
    queryKey: ['owner-orders', venueId],
    queryFn: () => api.ownerListOrders(venueId ?? ''),
    enabled: Boolean(venueId),
    refetchInterval: 5000,
  });
  const made = (orders.data?.items ?? []).reduce((sum, order) => sum + order.paidPesewas, 0);
  return (
    <ThemeProvider theme={ozaaTheme}>
      <SafeScreen includeBottom={false}>
        <ScrollView contentContainerStyle={styles.page}>
          <Text variant="body">{t('owner.made', { amount: formatMoney(pesewas(made)) })}</Text>
          {(orders.data?.items ?? []).map((order) => (
            <View key={order.id} style={styles.card}>
              <Text variant="body-strong">
                #{order.number} · {t(`statusLabel.${order.status}`)}
              </Text>
              <Text variant="caption">
                {order.tableCode ? t('home.table', { code: order.tableCode }) : ''}
              </Text>
            </View>
          ))}
        </ScrollView>
      </SafeScreen>
    </ThemeProvider>
  );
}

export function OwnerServices() {
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const services = useQuery({
    queryKey: ['services', venueId],
    queryFn: () => api.ownerGetServices(venueId),
    enabled: Boolean(venueId),
  });
  const save = useMutation({
    mutationFn: () => {
      const current = services.data;
      if (!current) throw new Error('missing');
      return api.ownerSetServices(venueId, current);
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ['services', venueId] }),
  });
  const theme = useTheme();
  return (
    <ThemeProvider theme={ozaaTheme}>
      <SafeScreen includeBottom={false}>
        <ScrollView contentContainerStyle={styles.page}>
          {(services.data?.services ?? []).map((service) => (
            <Pressable
              key={service.id}
              accessibilityRole="switch"
              accessibilityState={{ checked: service.enabled }}
              onPress={() => {
                if (!services.data) return;
                const next = {
                  ...services.data,
                  services: services.data.services.map((item) =>
                    item.id === service.id ? { ...item, enabled: !item.enabled } : item,
                  ),
                };
                void api
                  .ownerSetServices(venueId, next)
                  .then(() => client.invalidateQueries({ queryKey: ['services', venueId] }));
              }}
              style={styles.card}
            >
              <Text variant="body-strong">{service.id}</Text>
              <Text>{service.enabled ? 'On' : 'Off'}</Text>
            </Pressable>
          ))}
          <Text variant="caption" style={{ color: theme.meta }}>
            {save.isPending ? '…' : ''}
          </Text>
        </ScrollView>
      </SafeScreen>
    </ThemeProvider>
  );
}

export function OwnerReviews() {
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const reviews = useQuery({
    queryKey: ['owner-reviews', venueId],
    queryFn: () => api.ownerListVideoReviews(venueId),
    enabled: Boolean(venueId),
  });
  return (
    <ThemeProvider theme={ozaaTheme}>
      <SafeScreen includeBottom={false}>
        <ScrollView contentContainerStyle={styles.page}>
          <Text variant="display-m">{t('owner.reviews')}</Text>
          {(reviews.data?.items ?? []).map((review) => (
            <View key={review.id} style={styles.card}>
              <Text variant="body-strong">
                {review.firstName} · {review.stars}
              </Text>
              <Text>{review.quote}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeScreen>
    </ThemeProvider>
  );
}

export function OwnerCustomise() {
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const venue = useQuery({
    queryKey: ['owner-venue', venueId],
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  return (
    <ThemeProvider theme={ozaaTheme}>
      <SafeScreen includeBottom={false}>
        <ScrollView contentContainerStyle={styles.page}>
          <Text variant="display-m">{t('owner.customise')}</Text>
          <Text>{venue.data?.name}</Text>
          <TextInput
            accessibilityLabel="Colour"
            defaultValue={venue.data?.theme.accent ?? '#D24000'}
            style={styles.input}
          />
          <Text variant="caption">{venue.data?.theme.derived.notes.join(' ')}</Text>
        </ScrollView>
      </SafeScreen>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 12, backgroundColor: '#fff' },
  card: { borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 16, padding: 14, gap: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
  },
});

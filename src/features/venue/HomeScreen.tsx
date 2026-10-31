import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Globe, MapPin, Share2, Utensils } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { describeHours } from '@/lib/time';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { useTheme } from '@/ui/theme';
import { ServiceGrid } from './ServiceGrid';
import { StoryRow } from './StoryRow';
import { useStories, useVenue } from './useVenue';
import { ErrorState, LoadingState } from '@/ui/states';
import { useGuestSession } from '@/features/session';

export function HomeScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const venue = useVenue(slug);
  const stories = useStories(slug);
  const tableCode = useGuestSession((state) => (state.slug === slug ? state.tableCode : null));
  const orderId = useGuestSession((state) => (state.slug === slug ? state.orderId : null));
  const order = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(orderId ?? ''),
    enabled: Boolean(orderId),
    refetchInterval: 10_000,
  });

  if (venue.isLoading) return <LoadingState />;
  if (venue.isError || !venue.data) return <ErrorState onRetry={() => void venue.refetch()} />;
  const place = venue.data;
  const hours = describeHours(place.hours, new Date());
  const longName = place.name.length > 16;

  return (
    <SafeScreen includeTop={false}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 96 }}>
      <View style={[styles.banner, { height: 170 + insets.top }]}>
        <VenueImage url={place.banner.url} alt={place.banner.alt ?? place.name} style={styles.bannerImage} />
        <Pressable accessibilityRole="button" accessibilityLabel={t('home.share')} style={[styles.fab, styles.share, { top: insets.top + 12 }]}>
          <Share2 color={theme.black} size={18} strokeWidth={2} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('home.language')} style={[styles.fab, styles.lang, { top: insets.top + 12 }]}>
          <Globe color={theme.black} size={16} strokeWidth={2} />
          <Text variant="caption" style={styles.langText}>
            {t('home.language')}
          </Text>
        </Pressable>
        <View style={[styles.logo, { borderColor: theme.white, backgroundColor: theme.fill }]}>
          <Text variant="display-m" style={{ color: theme.onFill }}>
            {place.initials ?? place.name.slice(0, 2).toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.identity}>
        {tableCode ? (
          <View style={[styles.pill, { borderColor: theme.line }]}>
            <Utensils color={theme.ink} size={14} strokeWidth={2} />
            <Text variant="caption" style={styles.pillText}>
              {t('home.table', { code: tableCode })}
            </Text>
          </View>
        ) : null}
        <Text variant={longName ? 'display-m' : 'display-l'}>{place.name}</Text>
        <Text variant="body" style={{ color: theme.muted, marginTop: 8 }}>
          {place.description.en}
        </Text>
        <View style={styles.fact}>
          <MapPin color={theme.meta} size={16} strokeWidth={2} />
          <Text variant="body">{place.location.label}</Text>
        </View>
        <View style={styles.fact}>
          <View style={[styles.dot, { backgroundColor: hours.open ? theme.success : theme.meta }]} />
          <Text variant="body">
            <Text variant="body-strong" style={{ color: hours.open ? theme.success : theme.meta }}>
              {hours.text.split(' · ')[0]}
            </Text>
            {hours.text.includes(' · ') ? ` · ${hours.text.split(' · ').slice(1).join(' · ')}` : ''}
          </Text>
        </View>
      </View>
      <StoryRow slug={slug} stories={stories.data?.items ?? []} onOpen={(id) => router.push(`/${slug}/story/${id}`)} />
      <ServiceGrid slug={slug} services={place.services} onOpen={(id) => router.push(serviceHref(slug, id))} />
      <View style={styles.powered}>
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('home.powered')}
        </Text>
      </View>
    </ScrollView>
      {order.data && order.data.status !== 'served' && order.data.status !== 'cancelled' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/${slug}/status`)}
          style={[styles.orderBar, { borderColor: theme.line }]}
        >
          <View style={[styles.dot, { backgroundColor: theme.success }]} />
          <View style={{ flex: 1 }}>
            <Text variant="body-strong">{t('orderBar.title', { number: order.data.number, status: t(`statusLabel.${order.data.status}`) })}</Text>
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('orderBar.meta', { minutes: order.data.etaMinutes ?? 12, count: order.data.lines.length })}
            </Text>
          </View>
        </Pressable>
      ) : null}
    </SafeScreen>
  );
}

function serviceHref(slug: string, id: string): `/${string}` {
  const path =
    id === 'menu'
      ? 'menu'
      : id === 'status'
        ? 'status'
        : id === 'review'
          ? 'review'
          : id === 'play'
            ? 'play'
            : id;
  return `/${slug}/${path}`;
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#ddd' },
  bannerImage: { width: '100%', height: '100%' },
  fab: {
    position: 'absolute',
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  share: { left: 16, width: 40 },
  lang: { right: 16, flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  langText: { fontFamily: 'Inter_600' },
  logo: {
    position: 'absolute',
    left: 20,
    bottom: -42,
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { paddingHorizontal: 20, paddingTop: 52 },
  pill: {
    position: 'absolute',
    right: 20,
    top: 12,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
  },
  pillText: { fontFamily: 'Inter_600' },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  powered: { alignItems: 'center', marginTop: 28 },
  orderBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

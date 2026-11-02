import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Globe, Share2, Utensils } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { useTheme } from '@/ui/theme';
import { LanguagePicker } from './LanguagePicker';
import { languageByCode, chooseLanguage, type LanguageCode } from './languages';
import { shareVenueLink } from './shareVenue';
import { ServiceGrid } from './ServiceGrid';
import { VenueIntro } from './VenueIntro';
import { useVenue } from './useVenue';
import { ErrorState, LoadingState } from '@/ui/states';
import { OfflineNote } from '@/ui/OfflineNote';
import { useGuestSession } from '@/features/session';

export function HomeScreen({ slug }: { slug: string }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const language = languageByCode(i18n.language);
  const router = useRouter();
  const venue = useVenue(slug);
  const tableCode = useGuestSession((state) => (state.slug === slug ? state.tableCode : null));

  if (venue.isLoading) return <LoadingState />;
  if (venue.isError || !venue.data) return <ErrorState onRetry={() => void venue.refetch()} />;
  const place = venue.data;
  const pageLink = venuePageLink(slug, tableCode);

  return (
    <SafeScreen includeTop={false}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 96 }}>
        <View style={[styles.banner, { height: 140 + insets.top }]}>
          <VenueImage
            url={place.banner.url}
            alt={place.banner.alt ?? place.name}
            style={styles.bannerImage}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.share')}
            onPress={() => {
              void shareVenueLink(pageLink, place.name).then((result) => {
                if (result !== 'copied') return;
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            style={[styles.fab, styles.share, { top: insets.top + 12 }]}
          >
            <Share2 color={theme.black} size={18} strokeWidth={2} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.chooseLanguage')}
            onPress={() => setLanguageOpen(true)}
            style={[styles.fab, styles.lang, { top: insets.top + 12 }]}
          >
            <Globe color={theme.black} size={16} strokeWidth={2} />
            <Text variant="caption" style={styles.langText}>
              {language.label}
            </Text>
          </Pressable>
          {copied ? (
            <View style={[styles.copied, { top: insets.top + 60 }]}>
              <Text variant="caption">{t('home.linkCopied')}</Text>
            </View>
          ) : null}
          <View style={[styles.logo, { borderColor: theme.white, backgroundColor: theme.fill }]}>
            {place.logo ? (
              <VenueImage
                url={place.logo.url}
                alt={place.logo.alt ?? place.name}
                style={styles.logoImage}
              />
            ) : (
              <Text variant="title" style={{ color: theme.onFill }}>
                {place.initials ?? place.name.slice(0, 2).toUpperCase()}
              </Text>
            )}
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
          <VenueIntro venue={place} />
        </View>
        <OfflineNote savedAt={venue.dataUpdatedAt} />
        <ServiceGrid
          slug={slug}
          services={place.services}
          onOpen={(id) => router.push(serviceHref(slug, id))}
        />
        <View style={styles.powered}>
          <Text variant="caption" style={{ color: theme.meta }}>
            {t('home.powered')}
          </Text>
        </View>
      </ScrollView>
      <LanguagePicker
        open={languageOpen}
        selected={language.code}
        onChoose={(code: LanguageCode) => {
          void chooseLanguage(code);
        }}
        onClose={() => setLanguageOpen(false)}
      />
    </SafeScreen>
  );
}

function venuePageLink(slug: string, tableCode: string | null): string {
  const path = tableCode ? `/${slug}/t/${tableCode}` : `/${slug}`;
  const origin = globalThis.location?.origin;
  if (typeof origin === 'string' && origin.startsWith('http')) return `${origin}${path}`;
  return `https://ozaa.app${path}`;
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
  bannerImage: StyleSheet.absoluteFill,
  fab: {
    position: 'absolute',
    zIndex: 2,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  share: { start: 16, width: 40 },
  lang: { end: 16, flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  langText: { fontFamily: 'Inter_600' },
  copied: {
    position: 'absolute',
    start: 16,
    zIndex: 2,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logo: {
    position: 'absolute',
    start: 20,
    bottom: -30,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: { width: '100%', height: '100%' },
  identity: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 8 },
  pill: {
    position: 'absolute',
    end: 20,
    top: 10,
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
});

import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { env } from '@/lib/env';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { LanguagePicker } from './LanguagePicker';
import { languageByCode, chooseLanguage, type LanguageCode } from './languages';
import { shareVenueLink } from './shareVenue';
import { VenueHomeBody } from './VenueHomeBody';
import { useVenue } from './useVenue';
import { ErrorState, LoadingState } from '@/ui/states';
import { OfflineNote } from '@/ui/OfflineNote';
import { useGuestSession } from '@/features/session';
import { useGuestNotes } from '@/features/notices';

export function HomeScreen({ slug }: { slug: string }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const language = languageByCode(i18n.language);
  const router = useRouter();
  const venue = useVenue(slug);
  const notices = useGuestNotes(slug);
  const tableCode = useGuestSession((state) => (state.slug === slug ? state.tableCode : null));

  if (venue.isLoading) return <LoadingState />;
  if (venue.isError || !venue.data) return <ErrorState onRetry={() => void venue.refetch()} />;
  const place = venue.data;
  const pageLink = venuePageLink(slug, tableCode);

  return (
    <SafeScreen includeTop={false}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 96 }}>
        <VenueHomeBody
          venue={place}
          tableCode={tableCode}
          topInset={insets.top}
          languageLabel={language.label}
          onShare={() => {
            void shareVenueLink(pageLink, place.name).then((result) => {
              if (result !== 'copied') return;
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          onLanguage={() => setLanguageOpen(true)}
          onNotices={() => router.push(`/${slug}/notifications`)}
          notices={notices.unseen}
          onOpen={(id) => router.push(serviceHref(slug, id))}
          bannerNote={
            copied ? (
              <View
                style={[styles.copied, { top: insets.top + 60, backgroundColor: theme.surface }]}
              >
                <Text variant="caption">{t('home.linkCopied')}</Text>
              </View>
            ) : null
          }
        >
          <OfflineNote savedAt={venue.dataUpdatedAt} />
        </VenueHomeBody>
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
  return `${env.EXPO_PUBLIC_SITE_URL}${path}`;
}

// Every service id has a guest route of the same name (src/app/[venue]/<id>).
function serviceHref(slug: string, id: string): `/${string}` {
  return `/${slug}/${id}`;
}

const styles = StyleSheet.create({
  copied: {
    position: 'absolute',
    start: tokens.space[4],
    zIndex: 2,
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.space[2] + 2,
    paddingVertical: tokens.space[1] + 2,
  },
});

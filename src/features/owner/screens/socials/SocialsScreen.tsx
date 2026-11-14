import { StyleSheet, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { useDraft } from '../../data/useDraft';
import { useSaveVenue } from '../../data/useSaveVenue';
import { TitledSection } from '../../kit';
import { SOCIAL_LOGOS } from './SocialLogos';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

const PROFILES = ['instagram', 'facebook', 'tiktok', 'x', 'youtube', 'tripadvisor'] as const;
const CONTACT = ['whatsapp', 'phone', 'email', 'website'] as const;
type Key = (typeof PROFILES)[number] | (typeof CONTACT)[number];

const KEYBOARD: Partial<Record<Key, 'phone-pad' | 'email-address' | 'url'>> = {
  whatsapp: 'phone-pad',
  phone: 'phone-pad',
  email: 'email-address',
  website: 'url',
};

/** Where guests can follow or reach the venue (canvas): one row per link with its logo. */
export function SocialsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const socials = venue.data?.socials ?? {};
  const draft = useDraft(
    Object.fromEntries([...PROFILES, ...CONTACT].map((key) => [key, socials[key] ?? ''])) as Record<
      Key,
      string
    >,
  );
  const save = useSaveVenue(venueId, draft.reset);

  const submit = () => {
    const links = Object.fromEntries(
      Object.entries(draft.value).map(([key, text]) => [key, text.trim() || null]),
    );
    save.mutate({
      googleReviewUrl: null,
      socials: { ...socials, ...links, googleReviewUrl: null },
    });
  };

  const row = (key: Key, index: number) => {
    const Logo = SOCIAL_LOGOS[key];
    return (
      <View
        key={key}
        style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.line }]}
      >
        <View style={styles.name}>
          {Logo ? <Logo /> : null}
          <Text variant="body">{t(`ownerSocials.${key}`)}</Text>
        </View>
        <TextInput
          accessibilityLabel={t(`ownerSocials.${key}`)}
          value={draft.value[key]}
          onChangeText={(text) => draft.set(key, text)}
          placeholder={t(`ownerSocials.${key}Hint`)}
          placeholderTextColor={theme.meta}
          keyboardType={KEYBOARD[key] ?? 'default'}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: theme.text, borderColor: theme.line }]}
        />
      </View>
    );
  };

  return (
    <OwnerPage title={t('ownerPages.socialsTitle')} subtitle={t('ownerLead.socials')}>
      <DeskWait
        loading={venue.isLoading}
        error={venue.isError}
        onRetry={() => void venue.refetch()}
      >
        <View style={styles.stack}>
          <TitledSection title={t('ownerSocials.profiles')} cardStyle={styles.card}>
            {PROFILES.map(row)}
          </TitledSection>
          <TitledSection title={t('ownerSocials.contact')} cardStyle={styles.card}>
            {CONTACT.map(row)}
          </TitledSection>
          <View style={styles.foot}>
            <Text variant="caption" style={[styles.note, { color: theme.meta }]}>
              {t('ownerSocials.footnote')}
            </Text>
            {draft.dirty ? (
              <Button label={t('ownerKit.discard')} tone="ghost" onPress={draft.reset} />
            ) : null}
            <Button label={t('ownerSocials.save')} loading={save.isPending} onPress={submit} />
          </View>
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.owner.controls.sectionGap },
  card: { paddingVertical: tokens.space[1], paddingHorizontal: tokens.owner.controls.cardPadding },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.space[4],
    minHeight: 84,
    paddingVertical: 14,
  },
  // Canvas: logo and name in a fixed 200 px column, so every box starts at the same place.
  name: { width: 200, flexDirection: 'row', alignItems: 'center', gap: tokens.space[4] },
  input: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 0,
    height: 56,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 28,
    fontFamily: fontFamily.regular,
    fontSize: 16,
  },
  foot: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.space[3] },
  note: { flexGrow: 1, flexBasis: 300 },
});

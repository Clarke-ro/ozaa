import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { ownerKeys } from '../data/keys';
import { useDraft } from '../data/useDraft';
import { useSaveVenue } from '../data/useSaveVenue';
import { InputRow, SaveBar, Section } from '../kit';

const PROFILES = ['instagram', 'facebook', 'tiktok', 'x', 'youtube', 'tripadvisor'] as const;
const CONTACT = ['whatsapp', 'phone', 'email', 'website'] as const;
type Key = (typeof PROFILES)[number] | (typeof CONTACT)[number];

const KEYBOARD: Partial<Record<Key, 'phone-pad' | 'email-address' | 'url'>> = {
  whatsapp: 'phone-pad',
  phone: 'phone-pad',
  email: 'email-address',
  website: 'url',
};

/** Where guests can follow or reach the venue. Shown in the footer of the guest page. */
export function SocialsScreen() {
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
    // Reviews are asked for the same way from every guest, so no Google link or star filter is kept here.
    save.mutate({
      googleReviewUrl: null,
      socials: { ...socials, ...links, googleReviewUrl: null },
    });
  };

  const row = (key: Key) => (
    <InputRow
      key={key}
      label={t(`ownerSocials.${key}`)}
      value={draft.value[key]}
      onChangeText={(text) => draft.set(key, text)}
      placeholder={t(`ownerSocials.${key}Hint`)}
      keyboardType={KEYBOARD[key] ?? 'default'}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );

  return (
    <OwnerPage
      title={t('ownerPages.socialsTitle')}
      footer={
        <SaveBar
          visible={draft.dirty}
          saving={save.isPending}
          onSave={submit}
          onDiscard={draft.reset}
        />
      }
    >
      <DeskWait
        loading={venue.isLoading}
        error={venue.isError}
        onRetry={() => void venue.refetch()}
      >
        <Section title={t('ownerSocials.profiles')}>{PROFILES.map(row)}</Section>
        <Section title={t('ownerSocials.contact')} note={t('ownerSocials.contactNote')}>
          {CONTACT.map(row)}
        </Section>
      </DeskWait>
    </OwnerPage>
  );
}

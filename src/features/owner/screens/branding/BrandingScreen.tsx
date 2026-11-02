import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { describeHours } from '@/lib/time';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { useDraft } from '../../data/useDraft';
import { InputRow, PhotoField, SaveBar, Section, SectionBody, toast } from '../../kit';
import { BUTTON_KEYS, ButtonsSection } from './ButtonsSection';
import { GuestPreview } from './GuestPreview';
import { buttonLook, isHex, type Tint } from './look';
import { LookSection, type FontPair } from './LookSection';

/** How the guest page looks: preview on top, then colour, words, buttons and photos. */
export function BrandingScreen() {
  const { t } = useTranslation();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const v = venue.data;
  const draft = useDraft({
    accent: v?.theme.accent ?? '#D24000',
    font: (v?.theme.fontPair ?? 'ozaa') as FontPair,
    name: v?.name ?? '',
    tagline: v?.tagline ?? '',
    description: v?.description?.en ?? '',
    tint: (v?.buttonTint ?? 'auto') as Tint,
    order: v?.buttonOrder?.length ? v.buttonOrder : [...BUTTON_KEYS],
  });
  // Photos upload straight away; their ids are saved with the rest. undefined means unchanged.
  const [banner, setBanner] = useState<{ id: string; url: string | null } | undefined>(undefined);
  const [logo, setLogo] = useState<{ id: string | null; url: string | null } | undefined>(
    undefined,
  );
  const f = draft.value;
  const look = buttonLook(f.accent, f.tint);
  const dirty = draft.dirty || banner !== undefined || logo !== undefined;

  const reset = () => {
    draft.reset();
    setBanner(undefined);
    setLogo(undefined);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (draft.changes.accent !== undefined || draft.changes.font !== undefined) {
        await api.ownerSetTheme(venueId, { accent: f.accent, fontPair: f.font });
      }
      await api.ownerUpdateVenue(venueId, {
        name: f.name.trim(),
        tagline: f.tagline.trim() || undefined,
        description: { ...v?.description, en: f.description.trim() },
        buttonTint: f.tint,
        buttonOrder: f.order,
        ...(banner ? { bannerMediaId: banner.id } : {}),
        ...(logo ? { logoMediaId: logo.id } : {}),
      });
    },
    onSuccess: () => {
      toast.success(t('ownerBranding.saved'));
      reset();
      void client.invalidateQueries({ queryKey: ownerKeys.venue(venueId) });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  const submit = () => {
    if (!isHex(f.accent)) return toast.error(t('ownerBranding.hexError'));
    if (!f.name.trim()) return toast.error(t('ownerBranding.nameMissing'));
    save.mutate();
  };

  return (
    <OwnerPage
      title={t('owner.branding')}
      footer={<SaveBar visible={dirty} saving={save.isPending} onDiscard={reset} onSave={submit} />}
    >
      <DeskWait
        loading={venue.isLoading}
        error={venue.isError}
        onRetry={() => void venue.refetch()}
      >
        <GuestPreview
          accent={isHex(f.accent) ? f.accent : null}
          name={f.name}
          tagline={f.tagline}
          description={f.description}
          hoursText={v ? describeHours(v.hours, new Date()).text : undefined}
          locationLabel={v?.location.label}
          bannerUrl={banner?.url ?? v?.banner?.url}
          buttons={f.order.map((key) => ({ key, label: t(`ownerBranding.button.${key}`) }))}
          buttonInk={look.ink}
        />
        <LookSection
          accent={f.accent}
          onAccent={(hex) => draft.set('accent', hex)}
          font={f.font}
          onFont={(font) => draft.set('font', font)}
        />
        <Section title={t('ownerBranding.words')}>
          <InputRow
            label={t('ownerBranding.name')}
            value={f.name}
            onChangeText={(text) => draft.set('name', text)}
            maxLength={60}
          />
          <InputRow
            label={t('ownerBranding.tagline')}
            value={f.tagline}
            onChangeText={(text) => draft.set('tagline', text)}
            placeholder={t('ownerLoyalty.optional')}
            maxLength={100}
          />
          <InputRow
            label={t('ownerBranding.description')}
            value={f.description}
            onChangeText={(text) => draft.set('description', text)}
            multiline
          />
        </Section>
        <ButtonsSection
          order={f.order}
          onOrder={(order) => draft.set('order', order)}
          tint={f.tint}
          onTint={(tint) => draft.set('tint', tint)}
          readable={look.readable}
        />
        <Section title={t('ownerBranding.photos')}>
          <SectionBody>
            <PhotoField
              venueId={venueId}
              kind="banner"
              label={t('owner.bannerPhoto')}
              url={banner?.url ?? v?.banner?.url ?? null}
              onChange={(id, url) => setBanner(id ? { id, url } : undefined)}
            />
            <PhotoField
              venueId={venueId}
              kind="logo"
              label={t('owner.logoPhoto')}
              url={logo ? logo.url : (v?.logo?.url ?? null)}
              onChange={(id, url) => setLogo({ id, url })}
            />
          </SectionBody>
        </Section>
      </DeskWait>
    </OwnerPage>
  );
}

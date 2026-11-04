import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { useDraft } from '../../data/useDraft';
import { tokens } from '@/theme/tokens';
import { InputRow, PhotoField, SaveBar, Section, SectionBody, Segmented, toast } from '../../kit';
import { BUTTON_KEYS, ButtonsSection } from './ButtonsSection';
import { GuestPreview } from './GuestPreview';
import { buttonLook, isHex, type Tint } from './look';
import { LookSection, type FontPair } from './LookSection';
import { MenuStyleSection } from './MenuStyleSection';
import { menuStyleOf } from '@/lib/menuStyle';

type Tab = 'look' | 'words' | 'buttons' | 'preview';

// From this width the guest preview sits beside the editor, so it needs no tab of its own.
const SIDE_BY_SIDE = 1000;

/**
 * How the guest page looks, one topic at a time: Look (photos, colour, font), Words, Buttons,
 * and a full Preview. On wide screens the preview stays beside whichever topic is open.
 */
export function BrandingScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const wide = width >= SIDE_BY_SIDE;
  const [tab, setTab] = useState<Tab>('look');
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const v = venue.data;
  const draft = useDraft({
    accent: v?.theme.accent ?? tokens.color.primary.hex,
    font: (v?.theme.fontPair ?? 'ozaa') as FontPair,
    name: v?.name ?? '',
    tagline: v?.tagline ?? '',
    description: v?.description?.en ?? '',
    tint: (v?.buttonTint ?? 'auto') as Tint,
    order: v?.buttonOrder?.length ? v.buttonOrder : [...BUTTON_KEYS],
    menuStyle: menuStyleOf(v?.menuStyle),
  });
  // Photos upload straight away; their ids are saved with the rest. undefined means unchanged.
  const [banner, setBanner] = useState<{ id: string; url: string | null } | undefined>(undefined);
  const [logo, setLogo] = useState<{ id: string | null; url: string | null } | undefined>(
    undefined,
  );
  const f = draft.value;
  const look = buttonLook(f.accent, f.tint);
  // The guest page as it will look after Save: the saved venue with the draft laid over it.
  const previewVenue = v
    ? {
        ...v,
        name: f.name || v.name,
        tagline: f.tagline || undefined,
        description: { ...v.description, en: f.description },
        banner: banner?.url ? { ...v.banner, url: banner.url } : v.banner,
        logo: logo ? (logo.url ? { url: logo.url, width: 1, height: 1 } : null) : v.logo,
      }
    : null;
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
        menuStyle: f.menuStyle,
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
        <Segmented<Tab>
          label={t('owner.branding')}
          value={tab === 'preview' && wide ? 'look' : tab}
          onChange={setTab}
          options={[
            { id: 'look', label: t('ownerBranding.tabs.look') },
            { id: 'words', label: t('ownerBranding.tabs.words') },
            { id: 'buttons', label: t('ownerBranding.tabs.buttons') },
            ...(wide ? [] : [{ id: 'preview' as const, label: t('ownerBranding.tabs.preview') }]),
          ]}
        />
        <View style={wide ? styles.split : styles.stack}>
          <View style={styles.editor}>
            {tab === 'look' || (wide && tab === 'preview') ? (
              <>
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
                <LookSection
                  accent={f.accent}
                  onAccent={(hex) => draft.set('accent', hex)}
                  font={f.font}
                  onFont={(font) => draft.set('font', font)}
                />
                <MenuStyleSection
                  style={f.menuStyle}
                  onChange={(next) => draft.set('menuStyle', next)}
                />
              </>
            ) : null}
            {tab === 'words' ? (
              <>
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
              </>
            ) : null}
            {tab === 'buttons' ? (
              <>
                <ButtonsSection
                  order={f.order}
                  onOrder={(order) => draft.set('order', order)}
                  tint={f.tint}
                  onTint={(tint) => draft.set('tint', tint)}
                  readable={look.readable}
                />
              </>
            ) : null}
            {tab === 'preview' && !wide ? (
              <>
                {previewVenue ? (
                  <GuestPreview
                    venue={previewVenue}
                    accent={isHex(f.accent) ? f.accent : null}
                    font={f.font}
                  />
                ) : null}
              </>
            ) : null}
          </View>
          {wide ? (
            <View style={styles.side}>
              {previewVenue ? (
                <GuestPreview
                  venue={previewVenue}
                  accent={isHex(f.accent) ? f.accent : null}
                  font={f.font}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[5] },
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[6] },
  editor: { flex: 1, gap: tokens.space[5] },
  side: { width: 380 },
});

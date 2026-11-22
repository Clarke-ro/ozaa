import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { useDraft } from '../../data/useDraft';
import { tokens } from '@/theme/tokens';
import { toast } from '../../kit';
import { Button } from '@/ui/Button';
import { useOwnerLayout } from '../../chrome/layout';
import { BrandPhotos } from './BrandPhotos';
import { ColourSection } from './ColourSection';
import { HomeOrderSection } from './HomeOrderSection';
import { orderSections, type HomeSection } from '@/features/venue';
import { TypeSection } from './TypeSection';
import { WordsSection } from './WordsSection';
import { GuestPreview } from './GuestPreview';
import { isHex, type Tint } from './look';
import { MenuSection } from './MenuSection';
import type { FontPair } from '@/ui/theme';
import { menuStyleOf } from '@/lib/menuStyle';

/**
 * How the guest pages look (canvas): photos, colour, type and theme, words, menu and the order of
 * the home buttons, beside "What guests see", a phone drawn with the unsaved changes.
 */
export function BrandingScreen() {
  const { t } = useTranslation();
  const client = useQueryClient();
  const { desktop } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const v = venue.data;
  const draft = useDraft({
    accent: v?.theme.accent ?? tokens.color.primary.hex,
    font: (v?.theme.fontPair ?? 'cravins') as FontPair,
    name: v?.name ?? '',
    tagline: v?.tagline ?? '',
    description: v?.description?.en ?? '',
    tint: (v?.buttonTint ?? 'auto') as Tint,
    order: orderSections(v?.sectionOrder) as string[],
    menuStyle: menuStyleOf(v?.menuStyle),
  });
  // Photos upload straight away; their ids are saved with the rest. undefined means unchanged.
  const [banner, setBanner] = useState<{ id: string; url: string | null } | undefined>(undefined);
  const [logo, setLogo] = useState<{ id: string | null; url: string | null } | undefined>(
    undefined,
  );
  const f = draft.value;
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
        sectionOrder: f.order as HomeSection[],
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
    if (!dirty) return;
    if (!isHex(f.accent)) return toast.error(t('ownerBranding.hexError'));
    if (!f.name.trim()) return toast.error(t('ownerBranding.nameMissing'));
    save.mutate();
  };

  const form = (
    <View style={styles.stack}>
      <BrandPhotos
        venueId={venueId}
        coverUrl={banner?.url ?? v?.banner?.url ?? null}
        logoUrl={logo ? logo.url : (v?.logo?.url ?? null)}
        onCover={setBanner}
        onLogo={setLogo}
      />
      <ColourSection
        accent={f.accent}
        onAccent={(hex) => draft.set('accent', hex)}
        tint={f.tint}
        onTint={(tint) => draft.set('tint', tint)}
      />
      <TypeSection
        font={f.font}
        onFont={(font) => draft.set('font', font)}
        scheme={f.menuStyle.colorScheme}
        onScheme={(colorScheme) => draft.set('menuStyle', { ...f.menuStyle, colorScheme })}
      />
      <WordsSection value={f} onChange={(key, text) => draft.set(key, text)} />
      <MenuSection style={f.menuStyle} onChange={(next) => draft.set('menuStyle', next)} />
      <HomeOrderSection order={f.order} onOrder={(order) => draft.set('order', order)} />
      <View style={styles.saveRow}>
        <Button label={t('ownerBranding.saveBranding')} loading={save.isPending} onPress={submit} />
        {dirty ? <Button label={t('ownerKit.discard')} tone="ghost" onPress={reset} /> : null}
      </View>
    </View>
  );
  const preview = previewVenue ? (
    <GuestPreview
      venue={previewVenue}
      accent={isHex(f.accent) ? f.accent : null}
      font={f.font}
      dark={f.menuStyle.colorScheme === 'dark'}
    />
  ) : null;

  return (
    <OwnerPage width="mid" title={t('owner.branding')} subtitle={t('ownerLead.branding')}>
      <DeskWait
        loading={venue.isPending}
        error={venue.isError}
        onRetry={() => void venue.refetch()}
      >
        {desktop ? (
          <View style={styles.split}>
            <View style={styles.form}>{form}</View>
            <View style={styles.aside}>{preview}</View>
          </View>
        ) : (
          <View style={styles.stack}>
            {form}
            {preview}
          </View>
        )}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.owner.controls.sectionGap },
  // Canvas: a form up to 560 px and a 360 px "What guests see" column, 32 px apart.
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.owner.controls.sectionGap },
  form: { flex: 1, maxWidth: 560, minWidth: 0 },
  aside: { width: 360 },
  saveRow: { flexDirection: 'row', gap: 10 },
});

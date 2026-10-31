import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { useTheme } from '@/ui/theme';
import { deriveTheme } from '@/features/theming';
import { describeHours } from '@/lib/time';
import { VenueImage } from '@/ui/VenueImage';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';

const PRESETS = ['#B5432A', '#1F5C3F', '#FFC21A', '#D24000'];

export function BrandingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const venue = useQuery({ queryKey: ['owner-venue', venueId], queryFn: () => api.ownerGetVenue(venueId), enabled: Boolean(venueId) });
  const [accent, setAccent] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const colour = accent ?? venue.data?.theme.accent ?? '#D24000';
  const valid = /^#[0-9A-Fa-f]{6}$/.test(colour);
  const derived = valid ? deriveTheme(colour) : null;
  const hours = venue.data ? describeHours(venue.data.hours, new Date()) : null;
  const upload = useMutation({
    mutationFn: (kind: 'banner' | 'logo') => api.ownerCreateMediaUpload(venueId, { kind, contentType: 'image/webp', sizeBytes: 200_000 }),
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!venue.data || !derived) return;
      await api.ownerSetTheme(venueId, { accent: colour, fontPair: venue.data.theme.fontPair });
      await api.ownerUpdateVenue(venueId, {
        name: name ?? venue.data.name,
        description: { en: description ?? venue.data.description.en ?? '' },
      });
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ['owner-venue', venueId] }),
  });

  return (
    <OwnerPage title={t('owner.branding')}>
      <DeskWait loading={venue.isLoading} error={venue.isError} onRetry={() => void venue.refetch()}>
        <Text variant="caption" style={{ color: theme.meta }}>{t('owner.preview')}</Text>
        <View style={[styles.preview, { borderColor: theme.line }]}>
          {venue.data?.banner.url ? <VenueImage url={venue.data.banner.url} alt={venue.data.name} style={styles.banner} /> : null}
          <Text variant="display-m">{name ?? venue.data?.name}</Text>
          <Text>{description ?? venue.data?.description.en}</Text>
          {hours ? <Text variant="caption">{hours.text}</Text> : null}
          {venue.data?.location.label ? <Text variant="caption">{venue.data.location.label}</Text> : null}
          <View style={[styles.sampleButton, { backgroundColor: derived?.fill ?? theme.fill }]}>
            <Text variant="button" style={{ color: derived?.onAccent ?? '#fff' }}>{t('menu.title')}</Text>
          </View>
        </View>
        <Text variant="body-strong">{t('owner.colour')}</Text>
        <View style={styles.presets}>
          {PRESETS.map((preset) => (
            <Pressable key={preset} accessibilityRole="button" accessibilityLabel={preset} onPress={() => setAccent(preset)} style={[styles.swatch, { backgroundColor: preset, borderColor: colour === preset ? theme.black : theme.line }]} />
          ))}
        </View>
        <TextInput accessibilityLabel={t('owner.colour')} value={colour} onChangeText={setAccent} autoCapitalize="characters" style={[styles.input, { borderColor: theme.line, color: theme.text }]} />
        {derived ? (
          <Text variant="caption" style={{ color: theme.meta }}>
            {t('owner.contrast', { button: derived.ratios.buttonText, ink: derived.ratios.inkOnWhite })}
          </Text>
        ) : null}
        {derived?.tooCloseToOzaa ? <Text>{t('owner.colourClose')}</Text> : null}
        <TextInput accessibilityLabel={t('owner.setupName')} value={name ?? venue.data?.name ?? ''} onChangeText={setName} style={[styles.input, { borderColor: theme.line, color: theme.text }]} />
        <TextInput accessibilityLabel={t('owner.description')} value={description ?? venue.data?.description.en ?? ''} onChangeText={setDescription} style={[styles.input, { borderColor: theme.line, color: theme.text }]} />
        <Button label={t('owner.save')} onPress={() => save.mutate()} loading={save.isPending} disabled={!derived} />
        <View style={styles.presets}>
          <Button label={t('owner.bannerPhoto')} tone="secondary" onPress={() => upload.mutate('banner')} loading={upload.isPending} />
          <Button label={t('owner.logoPhoto')} tone="secondary" onPress={() => upload.mutate('logo')} loading={upload.isPending} />
        </View>
        {upload.data ? <Text variant="caption">{t('owner.uploadReady')}</Text> : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  preview: { borderWidth: 1, borderRadius: tokens.radius.lg, padding: tokens.space[4], gap: tokens.space[2] },
  banner: { height: 120, width: '100%', borderRadius: tokens.radius.md },
  sampleButton: { minHeight: 44, borderRadius: tokens.radius.md, alignItems: 'center', justifyContent: 'center', marginTop: tokens.space[2] },
  presets: { flexDirection: 'row', gap: tokens.space[3] },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  input: { borderWidth: 1, borderRadius: tokens.radius.md, minHeight: 48, paddingHorizontal: tokens.space[3] },
});

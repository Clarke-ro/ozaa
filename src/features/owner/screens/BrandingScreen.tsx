import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle2, Image as ImageIcon, Palette, Sparkles } from 'lucide-react-native';
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
import { DeskCard, IconTile, SectionLabel } from '../kit';

const PRESETS = [
  { hex: '#B5432A', name: 'Terracotta', venue: "Mama's Kitchen" },
  { hex: '#1F5C3F', name: 'Forest Green', venue: 'Bean There' },
  { hex: '#FFC21A', name: 'Warm Gold', venue: "Auntie Ako's" },
  { hex: '#D24000', name: 'Ozaa Signature', venue: 'Default' },
];

export function BrandingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const venue = useQuery({
    queryKey: ['owner-venue', venueId],
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });

  const [accent, setAccent] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);

  const colour = accent ?? venue.data?.theme.accent ?? '#D24000';
  const valid = /^#[0-9A-Fa-f]{6}$/.test(colour);
  const derived = valid ? deriveTheme(colour) : null;
  const hours = venue.data ? describeHours(venue.data.hours, new Date()) : null;

  const upload = useMutation({
    mutationFn: (kind: 'banner' | 'logo') =>
      api.ownerCreateMediaUpload(venueId, {
        kind,
        contentType: 'image/webp',
        sizeBytes: 200_000,
      }),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!venue.data || !derived) return;
      await api.ownerSetTheme(venueId, {
        accent: colour,
        fontPair: venue.data.theme.fontPair,
      });
      await api.ownerUpdateVenue(venueId, {
        name: name ?? venue.data.name,
        description: { en: description ?? venue.data.description.en ?? '' },
      });
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ['owner-venue', venueId] }),
  });

  const venueNameDisplay = name ?? venue.data?.name ?? 'Venue Name';
  const venueDescDisplay = description ?? venue.data?.description.en ?? 'African kitchen and grill.';

  return (
    <OwnerPage
      title={t('owner.branding')}
      subtitle="Customize your restaurant branding, theme accent colour, and photos."
    >
      <DeskWait loading={venue.isLoading} error={venue.isError} onRetry={() => void venue.refetch()}>
        {/* Live Guest Preview Card */}
        <DeskCard style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <View style={styles.previewTitleRow}>
              <IconTile icon={Sparkles} tone="tint" size={36} />
              <View>
                <Text variant="title">{t('owner.preview')}</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  How guests see your table menu and action buttons
                </Text>
              </View>
            </View>
            <View style={[styles.liveBadge, { backgroundColor: derived?.tint ?? '#FFF1EA' }]}>
              <Text variant="caption" style={{ color: derived?.badgeInk ?? '#D24000', fontWeight: '700' }}>
                LIVE PREVIEW
              </Text>
            </View>
          </View>

          {/* Guest Phone View Mockup */}
          <View style={[styles.previewPhoneFrame, { borderColor: theme.line }]}>
            {venue.data?.banner.url ? (
              <VenueImage url={venue.data.banner.url} alt={venueNameDisplay} style={styles.banner} />
            ) : (
              <View style={[styles.bannerPlaceholder, { backgroundColor: '#F4F4F5' }]}>
                <ImageIcon size={24} color="#A1A1AA" />
                <Text variant="caption" style={{ color: '#71717A' }}>
                  Banner photo placeholder
                </Text>
              </View>
            )}

            <View style={styles.phoneContent}>
              <Text variant="display-m" style={styles.previewVenueTitle}>
                {venueNameDisplay}
              </Text>
              <Text variant="body" style={styles.previewVenueDesc}>
                {venueDescDisplay}
              </Text>

              <View style={styles.metaRow}>
                {hours ? (
                  <View style={styles.pillChip}>
                    <Text variant="caption" style={{ fontWeight: '600' }}>
                      {hours.text}
                    </Text>
                  </View>
                ) : null}
                {venue.data?.location.label ? (
                  <View style={styles.pillChip}>
                    <Text variant="caption" style={{ color: theme.meta }}>
                      {venue.data.location.label}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Sample Styled UI elements */}
              <View style={styles.sampleControlsRow}>
                <View
                  style={[
                    styles.sampleButton,
                    { backgroundColor: derived?.fill ?? theme.fill },
                  ]}
                >
                  <Text variant="button" style={{ color: derived?.onAccent ?? '#FFFFFF' }}>
                    {t('menu.title')}
                  </Text>
                </View>

                <View
                  style={[
                    styles.samplePill,
                    { backgroundColor: derived?.tint ?? '#FFF1EA', borderColor: derived?.ink ?? '#D24000' },
                  ]}
                >
                  <Text variant="caption" style={{ color: derived?.badgeInk ?? '#D24000', fontWeight: '700' }}>
                    Popular (Sample)
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </DeskCard>

        {/* Brand Colour Customisation */}
        <DeskCard style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <IconTile icon={Palette} tone="tint" size={36} />
            <View>
              <Text variant="title">{t('owner.colour')}</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Applied to call-to-actions, category tags, badges, and story rings
              </Text>
            </View>
          </View>

          {/* Preset Swatches */}
          <View style={styles.presetGrid}>
            {PRESETS.map((preset) => {
              const isSelected = colour.toLowerCase() === preset.hex.toLowerCase();
              return (
                <Pressable
                  key={preset.hex}
                  accessibilityRole="button"
                  accessibilityLabel={preset.hex}
                  onPress={() => setAccent(preset.hex)}
                  style={[
                    styles.presetTile,
                    {
                      borderColor: isSelected ? theme.black : theme.line,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View style={[styles.swatchCircle, { backgroundColor: preset.hex }]}>
                    {isSelected ? <Check size={16} color={preset.hex === '#FFC21A' ? '#000' : '#FFF'} /> : null}
                  </View>
                  <View style={styles.presetTextCol}>
                    <Text variant="body-strong">{preset.name}</Text>
                    <Text variant="caption" style={{ color: theme.meta }}>
                      {preset.hex}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Custom Hex Code Field */}
          <View style={styles.fieldBlock}>
            <Text variant="caption" style={styles.fieldLabel}>
              Custom Hex Code
            </Text>
            <TextInput
              accessibilityLabel={t('owner.colour')}
              value={colour}
              onChangeText={setAccent}
              autoCapitalize="characters"
              placeholder="#D24000"
              placeholderTextColor={theme.meta}
              style={[styles.input, { borderColor: theme.line, color: theme.text }]}
            />
          </View>

          {/* WCAG Contrast check card */}
          {derived ? (
            <View style={styles.contrastCard}>
              <View style={styles.contrastHeader}>
                <CheckCircle2 size={16} color="#16A34A" />
                <Text variant="caption" style={{ fontWeight: '700', color: '#16A34A' }}>
                  WCAG Accessibility Contrast Pass
                </Text>
              </View>
              <Text variant="caption" style={{ color: theme.text }}>
                {t('owner.contrast', {
                  button: derived.ratios.buttonText,
                  ink: derived.ratios.inkOnWhite,
                })}
              </Text>
            </View>
          ) : null}

          {derived?.tooCloseToOzaa ? (
            <View style={styles.warningCard}>
              <Text variant="caption" style={{ color: '#B45309', fontWeight: '600' }}>
                {t('owner.colourClose')}
              </Text>
            </View>
          ) : null}
        </DeskCard>

        {/* Venue Information Form */}
        <DeskCard style={styles.sectionCard}>
          <SectionLabel title="VENUE IDENTITY" caps />

          <View style={styles.fieldBlock}>
            <Text variant="caption" style={styles.fieldLabel}>
              {t('owner.setupName')}
            </Text>
            <TextInput
              accessibilityLabel={t('owner.setupName')}
              value={name ?? venue.data?.name ?? ''}
              onChangeText={setName}
              placeholder="e.g. Mama's Kitchen"
              placeholderTextColor={theme.meta}
              style={[styles.input, { borderColor: theme.line, color: theme.text }]}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text variant="caption" style={styles.fieldLabel}>
              {t('owner.description')}
            </Text>
            <TextInput
              accessibilityLabel={t('owner.description')}
              value={description ?? venue.data?.description.en ?? ''}
              onChangeText={setDescription}
              placeholder="Tell guests about your specialties and story"
              placeholderTextColor={theme.meta}
              multiline
              numberOfLines={2}
              style={[styles.inputMultiline, { borderColor: theme.line, color: theme.text }]}
            />
          </View>
        </DeskCard>

        {/* Media Assets Upload */}
        <DeskCard style={styles.sectionCard}>
          <SectionLabel title="PHOTOS & LOGO" caps />

          <View style={styles.uploadRow}>
            <View style={styles.uploadCol}>
              <Button
                label={t('owner.bannerPhoto')}
                tone="secondary"
                onPress={() => upload.mutate('banner')}
                loading={upload.isPending}
              />
            </View>
            <View style={styles.uploadCol}>
              <Button
                label={t('owner.logoPhoto')}
                tone="secondary"
                onPress={() => upload.mutate('logo')}
                loading={upload.isPending}
              />
            </View>
          </View>

          {upload.data ? (
            <View style={styles.uploadSuccessBadge}>
              <CheckCircle2 size={16} color="#16A34A" />
              <Text variant="caption" style={{ color: '#16A34A', fontWeight: '600' }}>
                {t('owner.uploadReady')}
              </Text>
            </View>
          ) : null}
        </DeskCard>

        {/* Save & Publish Action */}
        <View style={styles.saveContainer}>
          <Button
            label={t('owner.save')}
            onPress={() => save.mutate()}
            loading={save.isPending}
            disabled={!derived}
          />
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  previewContainer: {
    gap: tokens.space[3],
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  liveBadge: {
    paddingHorizontal: tokens.space[2],
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
  },
  previewPhoneFrame: {
    backgroundColor: '#FFFFFF',
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  banner: {
    height: 140,
    width: '100%',
  },
  bannerPlaceholder: {
    height: 140,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  phoneContent: {
    padding: tokens.space[4],
    gap: tokens.space[2],
  },
  previewVenueTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  previewVenueDesc: {
    color: '#4B5563',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
    flexWrap: 'wrap',
    marginTop: 2,
  },
  pillChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: tokens.space[3],
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
  },
  sampleControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    marginTop: tokens.space[3],
    paddingTop: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  sampleButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  samplePill: {
    paddingHorizontal: tokens.space[3],
    paddingVertical: 8,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  sectionCard: {
    gap: tokens.space[3],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  presetTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    padding: tokens.space[2],
    borderRadius: tokens.radius.md,
    flex: 1,
    minWidth: 140,
  },
  swatchCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetTextCol: {
    flex: 1,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    minHeight: 48,
    paddingHorizontal: tokens.space[3],
    backgroundColor: '#FFFFFF',
  },
  inputMultiline: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    minHeight: 72,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    backgroundColor: '#FFFFFF',
  },
  contrastCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    gap: 4,
  },
  contrastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
  },
  uploadRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  uploadCol: {
    flex: 1,
  },
  uploadSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: tokens.space[2],
    backgroundColor: '#F0FDF4',
    borderRadius: tokens.radius.sm,
  },
  saveContainer: {
    paddingVertical: tokens.space[2],
  },
});

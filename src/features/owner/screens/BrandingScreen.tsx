import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown,
  ArrowUp,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GripVertical,
  Image as ImageIcon,
  Palette,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  Wifi,
} from 'lucide-react-native';
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
import { DeskCard, Field, IconTile, SectionLabel } from '../kit';

const PRESETS = [
  { id: 'modern' as const, hex: '#D24000', name: 'Ozaa Modern', desc: 'Energetic brand orange & deep ink' },
  { id: 'classic' as const, hex: '#B5432A', name: 'Terracotta Classic', desc: 'Rich earthen warmth for grills & suya' },
  { id: 'default' as const, hex: '#111111', name: 'Monochrome Default', desc: 'Sleek black & white contemporary' },
  { id: 'editorial' as const, hex: '#D97706', name: 'Bistro Editorial', desc: 'Amber gold tones for cafes & brunch' },
];

const DEFAULT_BUTTON_ORDER = ['menu', 'waiter', 'wifi', 'socials', 'links'];

const BUTTON_LABELS: Record<string, { label: string; icon: typeof BookOpen }> = {
  menu: { label: 'Browse Food & Drinks', icon: BookOpen },
  waiter: { label: 'Call Waiter & Service', icon: Bell },
  wifi: { label: 'Connect to Venue Wi-Fi', icon: Wifi },
  socials: { label: 'Reviews & Social Links', icon: Star },
  links: { label: 'Special Links & Bookings', icon: ExternalLink },
};

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

  const vData = venue.data;

  // Form states
  const [accent, setAccent] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [tagline, setTagline] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [stylePreset, setStylePreset] = useState<'default' | 'classic' | 'editorial' | 'modern' | null>(null);
  const [buttonTint, setButtonTint] = useState<'auto' | 'light' | 'dark' | null>(null);
  const [buttonOrder, setButtonOrder] = useState<string[] | null>(null);

  const activeColour = accent ?? vData?.theme.accent ?? '#D24000';
  const activeName = name ?? vData?.name ?? '';
  const activeTagline = tagline ?? vData?.tagline ?? '';
  const activeDesc = description ?? vData?.description?.en ?? '';
  const activePreset = stylePreset ?? (vData?.stylePreset as any) ?? 'modern';
  const activeTint = buttonTint ?? vData?.buttonTint ?? 'auto';
  const activeButtons = buttonOrder ?? vData?.buttonOrder ?? DEFAULT_BUTTON_ORDER;

  const valid = /^#[0-9A-Fa-f]{6}$/.test(activeColour);
  const derived = valid ? deriveTheme(activeColour) : null;
  const hours = vData ? describeHours(vData.hours, new Date()) : null;

  const buttonTextColor =
    activeTint === 'light'
      ? '#FFFFFF'
      : activeTint === 'dark'
      ? '#111111'
      : derived?.onAccent ?? '#FFFFFF';

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
      if (!vData || !derived) return;
      await api.ownerSetTheme(venueId, {
        accent: activeColour,
        fontPair: vData.theme.fontPair,
      });
      await api.ownerUpdateVenue(venueId, {
        name: activeName || vData.name,
        tagline: activeTagline || undefined,
        description: { en: activeDesc },
        stylePreset: activePreset,
        buttonTint: activeTint,
        buttonOrder: activeButtons,
      });
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ['owner-venue', venueId] }),
  });

  const moveButton = (index: number, direction: 'up' | 'down') => {
    const next = [...activeButtons];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= next.length) return;
    const from = next[index];
    const to = next[targetIdx];
    if (from && to) {
      next[index] = to;
      next[targetIdx] = from;
      setButtonOrder(next);
    }
  };

  return (
    <OwnerPage
      title={t('owner.branding')}
      subtitle="Customize venue page design, colors, button styling, presets, and button order."
    >
      <DeskWait loading={venue.isLoading} error={venue.isError} onRetry={() => void venue.refetch()}>
        <View style={styles.stack}>
          {/* Live Mobile Interactive Preview Card */}
          <DeskCard style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <View style={styles.previewTitleRow}>
                <IconTile icon={Sparkles} tone="tint" size={36} />
                <View>
                  <Text variant="title">Live Diner Page Preview</Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Updated automatically when you edit branding tokens
                  </Text>
                </View>
              </View>
              <View style={[styles.liveBadge, { backgroundColor: derived?.tint ?? '#FFF1EA' }]}>
                <Text variant="caption" style={{ color: derived?.badgeInk ?? '#D24000', fontWeight: '700' }}>
                  {String(activePreset).toUpperCase()} STYLE
                </Text>
              </View>
            </View>

            {/* Guest Phone View Frame */}
            <View style={[styles.phoneFrame, { borderColor: theme.line }]}>
              {vData?.banner?.url ? (
                <VenueImage url={vData.banner.url} alt={activeName} style={styles.banner} />
              ) : (
                <View style={[styles.bannerPlaceholder, { backgroundColor: '#F4F4F5' }]}>
                  <ImageIcon size={24} color="#A1A1AA" />
                  <Text variant="caption" style={{ color: '#71717A' }}>
                    Banner Cover Photo
                  </Text>
                </View>
              )}

              <View style={styles.phoneContent}>
                <Text variant="display-m" style={styles.venueTitleText}>
                  {activeName || 'Your Venue Name'}
                </Text>

                {activeTagline ? (
                  <Text variant="body-strong" style={{ color: activeColour }}>
                    {activeTagline}
                  </Text>
                ) : null}

                <Text variant="body" style={styles.venueDescText}>
                  {activeDesc || 'Authentic dishes, signature grills & cocktails.'}
                </Text>

                <View style={styles.metaChipsRow}>
                  {hours ? (
                    <View style={styles.pillChip}>
                      <Text variant="caption" style={{ fontWeight: '600' }}>
                        {hours.text}
                      </Text>
                    </View>
                  ) : null}
                  {vData?.location.label ? (
                    <View style={styles.pillChip}>
                      <Text variant="caption" style={{ color: theme.meta }}>
                        {vData.location.label}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Ordered Buttons Mockup */}
                <View style={styles.buttonsMockupList}>
                  {activeButtons.map((btnKey, idx) => {
                    const btnConfig = BUTTON_LABELS[btnKey];
                    if (!btnConfig) return null;
                    const isPrimary = idx === 0;

                    return (
                      <View
                        key={btnKey}
                        style={[
                          styles.mockupBtn,
                          isPrimary
                            ? { backgroundColor: derived?.fill ?? theme.fill }
                            : { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4E4E7' },
                        ]}
                      >
                        <Text
                          variant="button"
                          style={{
                            color: isPrimary ? buttonTextColor : '#111111',
                          }}
                        >
                          {btnConfig.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </DeskCard>

          {/* Style Presets */}
          <DeskCard style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <IconTile icon={Palette} tone="tint" size={36} />
              <View>
                <Text variant="title">Design Presets</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  One-tap curations tailored for Ghanaian dining rooms
                </Text>
              </View>
            </View>

            <View style={styles.presetGrid}>
              {PRESETS.map((preset) => {
                const isSelected = activePreset === preset.id;
                return (
                  <Pressable
                    key={preset.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    onPress={() => {
                      setStylePreset(preset.id);
                      setAccent(preset.hex);
                    }}
                    style={[
                      styles.presetTile,
                      {
                        borderColor: isSelected ? theme.black : theme.line,
                        borderWidth: isSelected ? 2 : 1,
                        backgroundColor: isSelected ? '#FAF5FF' : theme.white,
                      },
                    ]}
                  >
                    <View style={[styles.presetSwatch, { backgroundColor: preset.hex }]}>
                      {isSelected ? <Check size={16} color="#FFF" /> : null}
                    </View>
                    <View style={styles.presetInfo}>
                      <Text variant="body-strong">{preset.name}</Text>
                      <Text variant="caption" style={{ color: theme.meta }}>
                        {preset.desc}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </DeskCard>

          {/* Brand Accent Color & WCAG AA Contrast */}
          <DeskCard style={styles.card}>
            <SectionLabel title="BRAND COLOR & CONTRAST" caps />

            <View style={styles.fieldBlock}>
              <Text variant="caption" style={styles.fieldLabel}>
                Custom Accent Hex
              </Text>
              <TextInput
                accessibilityLabel={t('owner.colour')}
                value={activeColour}
                onChangeText={setAccent}
                autoCapitalize="characters"
                placeholder="#D24000"
                placeholderTextColor={theme.meta}
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
              />
            </View>

            {/* Button Tint Selector: Auto / Light / Dark */}
            <View style={styles.fieldBlock}>
              <Text variant="caption" style={styles.fieldLabel}>
                Button Text Tint
              </Text>
              <View style={styles.tintRow}>
                {[
                  { id: 'auto' as const, label: 'Auto (WCAG AA Validated)' },
                  { id: 'light' as const, label: 'Light (White)' },
                  { id: 'dark' as const, label: 'Dark (Deep Ink)' },
                ].map((tOpt) => {
                  const active = activeTint === tOpt.id;
                  return (
                    <Pressable
                      key={tOpt.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => setButtonTint(tOpt.id)}
                      style={[
                        styles.tintBtn,
                        {
                          borderColor: active ? theme.fill : theme.line,
                          backgroundColor: active ? theme.wash : theme.white,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        style={{
                          color: active ? theme.fill : theme.text,
                          fontWeight: active ? '700' : '500',
                        }}
                      >
                        {tOpt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Contrast Pass Notice */}
            {derived ? (
              <View style={[styles.contrastCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <View style={styles.contrastHeader}>
                  <CheckCircle2 size={16} color="#16A34A" />
                  <Text variant="caption" style={{ fontWeight: '700', color: '#16A34A' }}>
                    WCAG AA Accessibility Contrast Passed
                  </Text>
                </View>
                <Text variant="caption" style={{ color: theme.text }}>
                  Primary button contrast: {derived.ratios.buttonText}:1 · Text on surface: {derived.ratios.inkOnWhite}:1
                </Text>
              </View>
            ) : null}
          </DeskCard>

          {/* Venue Identity (Title, Tagline, Story) */}
          <DeskCard style={styles.card}>
            <SectionLabel title="VENUE COPY & STORY" caps />

            <Field
              label="Venue Title"
              value={activeName}
              onChangeText={setName}
              placeholder="e.g. Mama's Kitchen"
            />

            <Field
              label="Tagline (Subheading)"
              value={activeTagline}
              onChangeText={setTagline}
              placeholder="e.g. Accra's favorite fire-grilled tilapia & banku"
            />

            <Field
              label="Description / About Story"
              value={activeDesc}
              onChangeText={setDescription}
              placeholder="Tell guests about your cooking philosophy and heritage"
              multiline
              numberOfLines={3}
            />
          </DeskCard>

          {/* Drag & Move Button Order */}
          <DeskCard style={styles.card}>
            <SectionLabel title="PAGE BUTTONS ORDER" caps />
            <Text variant="caption" style={{ color: theme.meta }}>
              The top button receives primary brand accent styling. Use the arrows to reorder.
            </Text>

            <View style={styles.reorderList}>
              {activeButtons.map((key, idx) => {
                const item = BUTTON_LABELS[key];
                if (!item) return null;
                const isFirst = idx === 0;
                const isLast = idx === activeButtons.length - 1;

                return (
                  <View key={key} style={[styles.reorderItem, { borderColor: theme.line }]}>
                    <View style={styles.reorderLeft}>
                      <View style={[styles.rankBadge, { backgroundColor: isFirst ? activeColour : '#F4F4F5' }]}>
                        <Text
                          variant="caption"
                          style={{
                            color: isFirst ? '#FFF' : '#71717A',
                            fontWeight: '800',
                          }}
                        >
                          {idx + 1}
                        </Text>
                      </View>
                      <Text variant="body-strong">{item.label}</Text>
                      {isFirst ? (
                        <View style={[styles.primaryPill, { backgroundColor: '#FEF3C7' }]}>
                          <Text variant="caption" style={{ color: '#92400E', fontWeight: '700' }}>
                            Primary Filled
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.reorderArrows}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Move up"
                        disabled={isFirst}
                        onPress={() => moveButton(idx, 'up')}
                        style={[styles.arrowBtn, isFirst && { opacity: 0.3 }]}
                      >
                        <ChevronUp size={18} color={theme.text} />
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Move down"
                        disabled={isLast}
                        onPress={() => moveButton(idx, 'down')}
                        style={[styles.arrowBtn, isLast && { opacity: 0.3 }]}
                      >
                        <ChevronDown size={18} color={theme.text} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </DeskCard>

          {/* Media Assets Upload */}
          <DeskCard style={styles.card}>
            <SectionLabel title="COVER BANNER & LOGO" caps />

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
              <View style={[styles.contrastCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <CheckCircle2 size={16} color="#16A34A" />
                <Text variant="caption" style={{ color: '#16A34A', fontWeight: '600' }}>
                  {t('owner.uploadReady')}
                </Text>
              </View>
            ) : null}
          </DeskCard>

          {/* Save Button */}
          <View style={styles.saveContainer}>
            <Button
              label={save.isSuccess ? 'Saved successfully' : 'Save venue design'}
              tone="primary"
              onPress={() => save.mutate()}
              loading={save.isPending}
            />
          </View>
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  card: {
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
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
  phoneFrame: {
    backgroundColor: '#FFFFFF',
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  banner: {
    height: 140,
    width: '100%',
  },
  bannerPlaceholder: {
    height: 120,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  phoneContent: {
    padding: tokens.space[4],
    gap: tokens.space[2],
  },
  venueTitleText: {
    fontSize: 22,
    fontWeight: '800',
  },
  venueDescText: {
    color: '#4B5563',
    lineHeight: 20,
  },
  metaChipsRow: {
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
  buttonsMockupList: {
    gap: tokens.space[2],
    marginTop: tokens.space[3],
    paddingTop: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  mockupBtn: {
    minHeight: 44,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space[3],
  },
  presetGrid: {
    gap: tokens.space[2],
  },
  presetTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
  },
  presetSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetInfo: {
    flex: 1,
    gap: 2,
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
  tintRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  tintBtn: {
    flex: 1,
    minWidth: 140,
    paddingVertical: 10,
    paddingHorizontal: tokens.space[2],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contrastCard: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    gap: 4,
  },
  contrastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reorderList: {
    gap: tokens.space[2],
    marginTop: tokens.space[1],
  },
  reorderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  reorderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    flex: 1,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  reorderArrows: {
    flexDirection: 'row',
    gap: 4,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  uploadCol: {
    flex: 1,
  },
  saveContainer: {
    paddingVertical: tokens.space[2],
  },
});

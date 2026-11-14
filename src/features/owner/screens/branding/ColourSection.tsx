import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { hapticSelection } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { Segmented, TitledSection } from '../../kit';
import { FieldLabel } from './FieldLabel';
import { buttonLook, isHex, normaliseHex, type Tint } from './look';

// The canvas palette. Any hex still works in the code field; these save typing.
const SWATCHES = [
  { hex: '#B5432A', name: 'Clay' },
  { hex: '#D24000', name: 'Orange' },
  { hex: '#B42318', name: 'Red' },
  { hex: '#BE185D', name: 'Pink' },
  { hex: '#6D28D9', name: 'Purple' },
  { hex: '#1D4ED8', name: 'Blue' },
  { hex: '#0E7490', name: 'Teal' },
  { hex: '#0F7A55', name: 'Green' },
  { hex: '#E8B931', name: 'Gold' },
  { hex: '#111111', name: 'Black' },
] as const;

/** Venue colour, its code with the contrast check, and the button text colour. */
export function ColourSection({
  accent,
  onAccent,
  tint,
  onTint,
}: {
  accent: string;
  onAccent: (hex: string) => void;
  tint: Tint;
  onTint: (tint: Tint) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const bad = !isHex(accent);
  const look = buttonLook(accent, tint);
  const inkName =
    look.ink === '#FFFFFF' ? t('ownerBranding.tints.light') : t('ownerBranding.tints.dark');
  return (
    <TitledSection title={t('ownerBranding.colourTitle')} cardStyle={styles.card}>
      <View style={styles.block}>
        <FieldLabel>{t('ownerBranding.colour')}</FieldLabel>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('ownerBranding.colour')}
          style={styles.swatches}
        >
          {SWATCHES.map((s) => {
            const on = s.hex.toUpperCase() === accent.toUpperCase();
            return (
              <Pressable
                key={s.hex}
                accessibilityRole="radio"
                accessibilityLabel={s.name}
                accessibilityState={{ checked: on }}
                onPress={() => {
                  void hapticSelection();
                  onAccent(s.hex);
                }}
                // Canvas: the picked swatch gets a dark ring with a white gap inside it.
                style={[
                  styles.swatch,
                  { backgroundColor: s.hex },
                  on && {
                    borderWidth: 2,
                    borderColor: theme.text,
                    boxShadow: `inset 0 0 0 3px ${theme.surface}`,
                  },
                ]}
              >
                {on ? (
                  <Check size={16} color={buttonLook(s.hex, 'auto').ink} strokeWidth={3} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.checkRow}>
        <View style={[styles.hexPill, { borderColor: bad ? theme.error : theme.line }]}>
          <View style={[styles.dot, { backgroundColor: bad ? theme.wash : accent }]} />
          <TextInput
            accessibilityLabel={t('ownerBranding.hex')}
            value={accent}
            onChangeText={(text) => onAccent(text.length >= 6 ? normaliseHex(text) : text)}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            style={[styles.hexInput, { color: theme.text }]}
          />
        </View>
        {bad ? (
          <Text variant="caption" style={{ color: theme.error }}>
            {t('ownerBranding.hexError')}
          </Text>
        ) : (
          <View style={styles.note} accessibilityLiveRegion="polite">
            <Check size={16} color={look.readable ? theme.success : theme.error} />
            <Text variant="caption" style={{ color: look.readable ? theme.success : theme.error }}>
              {t(look.readable ? 'ownerBranding.readsWell' : 'ownerBranding.readsBadly', {
                ink: inkName,
                ratio: look.ratio.toFixed(1),
              })}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.block}>
        <FieldLabel>{t('ownerBranding.tint')}</FieldLabel>
        <Segmented<Tint>
          label={t('ownerBranding.tint')}
          value={tint}
          onChange={onTint}
          options={[
            { id: 'auto', label: t('ownerBranding.tints.auto') },
            { id: 'light', label: t('ownerBranding.tints.light') },
            { id: 'dark', label: t('ownerBranding.tints.dark') },
          ]}
        />
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('ownerBranding.tintHint')}
        </Text>
      </View>
    </TitledSection>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, gap: tokens.space[5] },
  block: { gap: tokens.space[2] },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.space[3] },
  hexPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    paddingHorizontal: tokens.space[4],
    borderWidth: 1,
    borderRadius: 22,
  },
  dot: { width: 18, height: 18, borderRadius: 9 },
  hexInput: { width: 84, fontFamily: fontFamily.strong, fontSize: 15, padding: 0 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
});

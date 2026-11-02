import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { hapticSelection } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Section, SectionBody, Segmented } from '../../kit';
import { isHex, normaliseHex } from './look';

// Starting colours. Any hex works; these just save typing.
const SWATCHES = [
  { hex: '#D24000', name: 'Orange' },
  { hex: '#B5432A', name: 'Terracotta' },
  { hex: '#D97706', name: 'Amber' },
  { hex: '#047857', name: 'Green' },
  { hex: '#1D4ED8', name: 'Blue' },
  { hex: '#111111', name: 'Black' },
] as const;

export type FontPair = 'ozaa' | 'serif' | 'bold';

/** Venue colour (swatches or any hex) and heading font. */
export function LookSection({
  accent,
  onAccent,
  font,
  onFont,
}: {
  accent: string;
  onAccent: (hex: string) => void;
  font: FontPair;
  onFont: (font: FontPair) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const bad = !isHex(accent);
  return (
    <Section title={t('ownerBranding.look')}>
      <SectionBody>
        <View
          style={styles.swatches}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('ownerBranding.colour')}
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
                style={[styles.hit, on && { borderColor: theme.text }]}
              >
                <View style={[styles.swatch, { backgroundColor: s.hex }]}>
                  {on ? <Check size={18} color="#FFFFFF" strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.hexRow}>
          <Text variant="body" style={styles.flex}>
            {t('ownerBranding.hex')}
          </Text>
          <View
            style={[
              styles.preview,
              { backgroundColor: bad ? theme.wash : accent, borderColor: theme.line },
            ]}
          />
          <TextInput
            accessibilityLabel={t('ownerBranding.hex')}
            value={accent}
            onChangeText={(text) => onAccent(text.length >= 6 ? normaliseHex(text) : text)}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            style={[
              styles.hexInput,
              { color: theme.text, borderColor: bad ? theme.error : theme.line },
            ]}
          />
        </View>
        {bad ? (
          <Text variant="caption" style={{ color: theme.error }}>
            {t('ownerBranding.hexError')}
          </Text>
        ) : null}
      </SectionBody>
      <SectionBody>
        <Text variant="body">{t('ownerBranding.font')}</Text>
        <Segmented<FontPair>
          label={t('ownerBranding.font')}
          value={font}
          onChange={onFont}
          options={[
            { id: 'ozaa', label: t('ownerBranding.fonts.ozaa') },
            { id: 'serif', label: t('ownerBranding.fonts.serif') },
            { id: 'bold', label: t('ownerBranding.fonts.bold') },
          ]}
        />
      </SectionBody>
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[1] },
  hit: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  preview: { width: 28, height: 28, borderRadius: 14, borderWidth: 1 },
  hexInput: {
    width: 104,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space[2],
    fontFamily: 'Inter_400',
    fontSize: 16,
  },
});

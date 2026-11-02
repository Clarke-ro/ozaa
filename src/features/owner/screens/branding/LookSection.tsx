import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { hapticSelection } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { DISPLAY, fontFamily, useTheme } from '@/ui/theme';
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
  const card = [styles.card, { backgroundColor: theme.surface }];
  return (
    <View style={styles.stack}>
      {/* Each part is its own card with its name above it, so nothing is crammed together. */}
      <View style={styles.block}>
        <Label>{t('ownerBranding.colour')}</Label>
        <View
          style={[card, styles.swatches]}
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
                style={[styles.hit, { borderColor: on ? theme.text : theme.surface }]}
              >
                <View style={[styles.swatch, { backgroundColor: s.hex }]}>
                  {on ? <Check size={18} color={theme.white} strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.block}>
        <Label>{t('ownerBranding.hex')}</Label>
        <View
          style={[
            styles.field,
            { backgroundColor: theme.surface, borderColor: bad ? theme.error : theme.line },
          ]}
        >
          <View
            style={[
              styles.dot,
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
            style={[styles.input, { color: theme.text }]}
          />
        </View>
        {bad ? (
          <Text variant="caption" style={{ color: theme.error }}>
            {t('ownerBranding.hexError')}
          </Text>
        ) : null}
      </View>

      <View style={styles.block}>
        <Label>{t('ownerBranding.font')}</Label>
        <View style={styles.fonts} accessibilityRole="radiogroup">
          {FONTS.map((id) => {
            const on = id === font;
            return (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={t(`ownerBranding.fonts.${id}`)}
                onPress={() => onFont(id)}
                style={[card, styles.font, { borderColor: on ? theme.ink : theme.surface }]}
              >
                <Text variant="display-m" style={{ fontFamily: DISPLAY[id] }}>
                  {t('ownerBranding.fontSample')}
                </Text>
                <Text variant="caption" style={{ color: on ? theme.ink : theme.muted }}>
                  {t(`ownerBranding.fonts.${id}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const FONTS: FontPair[] = ['ozaa', 'serif', 'bold'];

function Label({ children }: { children: string }) {
  return (
    <Text variant="body-strong" style={styles.label}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[5] },
  block: { gap: tokens.space[2] },
  label: { fontSize: tokens.type.caption.size + 1 },
  card: {
    padding: tokens.space[3],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
  },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[1] },
  hit: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
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
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 48,
    paddingHorizontal: tokens.space[3],
    borderWidth: 1,
    borderRadius: tokens.radius.md,
  },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  input: {
    flex: 1,
    minHeight: 46,
    fontFamily: fontFamily.regular,
    fontSize: tokens.type.body.size,
  },
  fonts: { flexDirection: 'row', gap: tokens.space[2] },
  font: { flex: 1, alignItems: 'center', gap: tokens.space[1], borderWidth: 1.5 },
});

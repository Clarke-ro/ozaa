import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TableCardTemplate } from '@/features/tables';
import { hapticSelection } from '@/lib/haptics';
import { CARD_SWATCHES } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { Segmented } from '../../kit';

export const CARD_ACCENTS = CARD_SWATCHES;

const STYLES: TableCardTemplate[] = ['folded_tent', 'acrylic_stand', 'sticker'];

/** Style (with what it prints on) and colour for the table cards, as on the canvas. */
export function TableCardControls({
  template,
  onTemplate,
  accent,
  onAccent,
  venueAccent,
}: {
  template: TableCardTemplate;
  onTemplate: (template: TableCardTemplate) => void;
  accent: string;
  onAccent: (hex: string) => void;
  venueAccent: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const swatches = CARD_ACCENTS.map((c) => ({ ...c, hex: c.id === 'venue' ? venueAccent : c.hex }));
  const picked = swatches.find((c) => c.hex.toUpperCase() === accent.toUpperCase());
  return (
    <View style={styles.stack}>
      <View style={styles.block}>
        <Text style={styles.label}>{t('ownerTables.style')}</Text>
        <Segmented
          equal
          label={t('ownerTables.style')}
          value={template}
          onChange={onTemplate}
          options={STYLES.map((id) => ({ id, label: t(`ownerTables.styles.${id}`) }))}
        />
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('ownerTables.styleNote', { note: t(`ownerTables.notes.${template}`) })}
        </Text>
      </View>
      <View style={styles.block}>
        <Text style={styles.label}>
          {t('ownerTables.colour')}
          {picked ? (
            <Text style={[styles.label, styles.thin, { color: theme.meta }]}>
              {` · ${t(`ownerTables.accents.${picked.id}`)}`}
            </Text>
          ) : null}
        </Text>
        <View
          style={styles.swatches}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('ownerTables.colour')}
        >
          {swatches.map((c) => {
            const on = c === picked;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="radio"
                accessibilityLabel={t(`ownerTables.accents.${c.id}`)}
                accessibilityState={{ checked: on }}
                onPress={() => {
                  void hapticSelection();
                  onAccent(c.hex);
                }}
                // Canvas: the picked swatch gets a dark ring with a white gap inside it.
                style={[
                  styles.swatch,
                  { backgroundColor: c.hex },
                  on && {
                    borderWidth: 2,
                    borderColor: theme.text,
                    boxShadow: `inset 0 0 0 3px ${theme.surface}`,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[6] },
  block: { gap: tokens.space[3] },
  label: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.strong },
  thin: { fontFamily: fontFamily.regular },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
  swatch: { width: 36, height: 36, borderRadius: 18 },
});

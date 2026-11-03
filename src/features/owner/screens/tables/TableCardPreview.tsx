import { Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { env } from '@/lib/env';
import type { Table } from '@/lib/api/types';
import { qrModules } from '@/lib/qrSvg';
import { hapticSelection } from '@/lib/haptics';
import type { TableCardTemplate } from '@/features/tables';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { ozaaTheme, ThemeProvider, useTheme } from '@/ui/theme';
import { Segmented } from '../../kit';

// Card accents. Names are read out by screen readers and shown under the selected swatch.
export const CARD_ACCENTS = [
  { hex: '#D24000', name: 'Orange' },
  { hex: '#111111', name: 'Black' },
  { hex: '#047857', name: 'Green' },
  { hex: '#1D4ED8', name: 'Blue' },
  { hex: '#6D28D9', name: 'Purple' },
] as const;

// A QR code must be dark on light or many phone cameras will not read it, so these never follow dark mode.
const QR_INK = '#111111';
const QR_PAPER = '#FFFFFF';

export function TableCardControls({
  template,
  onTemplate,
  accent,
  onAccent,
}: {
  template: TableCardTemplate;
  onTemplate: (template: TableCardTemplate) => void;
  accent: string;
  onAccent: (hex: string) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const selected = CARD_ACCENTS.find((c) => c.hex === accent);
  return (
    <View style={styles.controls}>
      <Segmented
        label={t('ownerTables.format')}
        value={template}
        onChange={onTemplate}
        options={[
          { id: 'folded_tent', label: t('ownerTables.tent') },
          { id: 'acrylic_stand', label: t('ownerTables.stand') },
          { id: 'sticker', label: t('ownerTables.sticker') },
        ]}
      />
      <View
        style={styles.swatchRow}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('ownerTables.colour')}
      >
        {CARD_ACCENTS.map((c) => {
          const on = c.hex === accent;
          return (
            <Pressable
              key={c.hex}
              accessibilityRole="radio"
              accessibilityLabel={c.name}
              accessibilityState={{ checked: on }}
              onPress={() => {
                void hapticSelection();
                onAccent(c.hex);
              }}
              style={[styles.swatchHit, on && { borderColor: theme.text }]}
            >
              <View style={[styles.swatch, { backgroundColor: c.hex }]}>
                {on ? <Check size={18} color={QR_PAPER} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          );
        })}
        <Text variant="caption" style={{ color: theme.muted }}>
          {selected?.name}
        </Text>
      </View>
    </View>
  );
}

/** What the printed card will look like. Always drawn light, because it is a piece of paper. */
export function TableCardPreview({
  table,
  venueName,
  template,
  accent,
  cta,
}: {
  table: Table;
  venueName: string;
  template: TableCardTemplate;
  accent: string;
  cta: string;
}) {
  const label = table.label ?? `Table ${table.code}`;
  return (
    <ThemeProvider theme={ozaaTheme}>
      <View
        style={styles.stage}
        accessible
        accessibilityLabel={`${venueName}, ${label}, QR card preview`}
      >
        <View
          style={[
            styles.card,
            template === 'sticker' && styles.sticker,
            template === 'acrylic_stand' && styles.acrylic,
          ]}
        >
          <View style={[styles.topBar, { backgroundColor: accent }]} />
          <View style={styles.inner}>
            <Image source={require('../../../../../assets/images/icon.png')} style={styles.logo} />
            <Text variant="title" style={styles.center} numberOfLines={2}>
              {venueName}
            </Text>
            <View style={[styles.badge, { backgroundColor: QR_INK }]}>
              <Text variant="title" style={{ color: QR_PAPER }}>
                {label}
              </Text>
            </View>
            <QrMark url={table.qrUrl ?? ''} />
            <Text variant="caption" style={[styles.center, { color: ozaaTheme.muted }]}>
              {cta}
            </Text>
          </View>
        </View>
      </View>
    </ThemeProvider>
  );
}

function QrMark({ url }: { url: string }) {
  const drawn = qrModules(url || env.EXPO_PUBLIC_SITE_URL, 168);
  return (
    <Svg width={168} height={168} viewBox={`0 0 ${drawn.size} ${drawn.size}`}>
      <Rect width={drawn.size} height={drawn.size} fill={QR_PAPER} />
      <Path d={drawn.path} fill={QR_INK} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  controls: { gap: tokens.space[3] },
  swatchRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1], flexWrap: 'wrap' },
  swatchHit: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderRadius: tokens.radius.full,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    alignItems: 'center',
    paddingVertical: tokens.space[4],
    borderRadius: tokens.radius.md,
    backgroundColor: ozaaTheme.wash,
  },
  card: {
    width: '86%',
    maxWidth: 300,
    backgroundColor: QR_PAPER,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: ozaaTheme.line,
    overflow: 'hidden',
  },
  sticker: { borderRadius: 150, maxWidth: 260 },
  acrylic: { borderRadius: tokens.radius.sm, borderWidth: 2 },
  topBar: { height: 6 },
  inner: { alignItems: 'center', gap: tokens.space[2], padding: tokens.space[5] },
  logo: { width: 40, height: 40, borderRadius: tokens.radius.sm },
  badge: {
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[1],
    borderRadius: tokens.radius.full,
  },
  center: { textAlign: 'center' },
});

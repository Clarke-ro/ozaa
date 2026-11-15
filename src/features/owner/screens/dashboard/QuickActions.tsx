import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { PressableScale } from '@/ui/PressableScale';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerLayout } from '../../chrome/layout';
import { navFor, type OwnerNavId } from '../../chrome/nav';
import { NAV_ICONS } from '../../chrome/navIcons';
import { Band } from './Band';
import { cardStyle } from '../../kit/cardStyle';
import { SectionHead } from './SectionHead';

// The pages people open most from Today, in this order. Each tile uses the page's sidebar icon
// and name, so a tile and its sidebar item always look the same.
const SHORTCUTS: readonly OwnerNavId[] = [
  'menu',
  'tables',
  'links',
  'insights',
  'notice',
  'loyalty',
  'feedback',
  'scan',
];
const TILE = tokens.owner.controls.tileMinHeight;

/**
 * A grid of square-ish tiles, with an icon over a name. Wide screens show four columns. Phones
 * show three, then switch to two when the screen is narrow or text is large (Clarke's reference,
 * 2026-11-14).
 * Only the pages this person may open (navFor also drops pages switched off in this build);
 * with none, the section is left out. The last row is padded so tiles keep one width.
 */
export function QuickActions() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { wide } = useOwnerLayout();
  const { fontScale, width } = useWindowDimensions();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const allowed = navFor(role);
  const shown = SHORTCUTS.flatMap((id) => allowed.filter((item) => item.id === id));
  if (shown.length === 0) return null;

  const needsTwoColumns = width < 360 || fontScale > 1.3;
  const across = wide ? 4 : needsTwoColumns ? 2 : 3;
  const rows: (typeof shown)[] = [];
  for (let i = 0; i < shown.length; i += across) rows.push(shown.slice(i, i + across));

  return (
    <Band>
      <SectionHead title={t('ownerDash.quickActions')} />
      <View style={styles.grid}>
        {rows.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map(({ id, href }) => {
              const Icon = NAV_ICONS[id];
              const label = t(`owner.${id}`);
              return (
                <PressableScale
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  onPress={() => router.push(href as Href)}
                  style={({ pressed }) => [
                    styles.tile,
                    !wide && styles.tilePhone,
                    cardStyle(theme),
                    pressed && { backgroundColor: theme.wash },
                  ]}
                >
                  <Icon size={wide ? 24 : 20} color={theme.text} />
                  <Text
                    variant="caption"
                    numberOfLines={2}
                    style={[styles.label, !wide && styles.labelPhone, { color: theme.muted }]}
                  >
                    {label}
                  </Text>
                </PressableScale>
              );
            })}
            {Array.from({ length: across - row.length }, (_, i) => (
              <View key={`gap-${i}`} style={styles.filler} />
            ))}
          </View>
        ))}
      </View>
    </Band>
  );
}

const styles = StyleSheet.create({
  grid: { gap: tokens.owner.controls.listGap },
  row: { flexDirection: 'row', gap: tokens.owner.controls.listGap },
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: TILE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: tokens.space[3],
  },
  label: {
    textAlign: 'center',
    fontSize: tokens.owner.type.body.size,
    lineHeight: tokens.owner.type.body.line,
  },
  tilePhone: { minHeight: 84, gap: tokens.space[2], padding: 10 },
  labelPhone: { fontSize: 12, lineHeight: 16 },
  filler: { flex: 1 },
});

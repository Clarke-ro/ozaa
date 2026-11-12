import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Link as LinkIcon } from 'lucide-react-native';
import type { CustomLink } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cardStyle, Toggle } from '../../kit';
import { LINK_ICONS } from './icons';

const CHIP = tokens.space[8] + tokens.space[1];

function host(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * One custom link as a white card: its icon in a soft orange chip, the button words, the site
 * and how many taps it has had, and a switch that shows or hides it. Tap the card to edit it.
 */
export function LinkRow({
  link,
  onEdit,
  onToggle,
  onMove,
}: {
  link: CustomLink;
  onEdit: () => void;
  onToggle: () => void;
  /** Move up (-1) or down (1). Left out at the ends, so the button can't do nothing. */
  onMove: { up?: () => void; down?: () => void };
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  // Read straight from the map so the icon component is a fixed module value, not one made
  // during render (react-hooks/static-components).
  const Icon = LINK_ICONS[link.icon ?? 'link'] ?? LinkIcon;
  const on = link.enabled;

  return (
    <View style={[styles.row, cardStyle(theme)]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('ownerLinks.editA11y', { title: link.title })}
        onPress={onEdit}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.6 }]}
      >
        <View style={[styles.chip, { backgroundColor: on ? theme.tint : theme.wash }]}>
          <Icon size={18} color={on ? theme.badgeInk : theme.meta} />
        </View>
        <View style={styles.flex}>
          <Text variant="body-strong" style={!on && { color: theme.muted }} numberOfLines={1}>
            {link.title}
          </Text>
          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
            {`${host(link.url)} · ${t('ownerLinks.clicks', {
              count: link.clicks,
              n: link.clicks.toLocaleString(i18n.language),
            })}`}
          </Text>
        </View>
      </Pressable>
      {(['up', 'down'] as const).map((dir) => {
        const move = onMove[dir];
        const Arrow = dir === 'up' ? ChevronUp : ChevronDown;
        return (
          <Pressable
            key={dir}
            accessibilityRole="button"
            accessibilityLabel={t(dir === 'up' ? 'ownerLinks.moveUp' : 'ownerLinks.moveDown', {
              title: link.title,
            })}
            accessibilityState={{ disabled: !move }}
            disabled={!move}
            onPress={move}
            style={({ pressed }) => [styles.move, pressed && { backgroundColor: theme.wash }]}
          >
            <Arrow size={18} color={move ? theme.muted : theme.line} />
          </Pressable>
        );
      })}
      <Toggle
        value={on}
        onChange={onToggle}
        label={t('ownerLinks.showA11y', { title: link.title })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: tokens.touchTarget + tokens.space[4],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  chip: {
    width: CHIP,
    height: CHIP,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
  move: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

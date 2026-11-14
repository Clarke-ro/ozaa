import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link as LinkIcon, Pencil } from 'lucide-react-native';
import type { CustomLink } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Toggle } from '../../kit';
import { LINK_ICONS } from './icons';
import { shortUrl } from './moveLink';

/**
 * One custom link inside its drag row (canvas): its icon, the button words, the address and how
 * many taps it has had, a pencil to edit, and a switch that shows or hides it.
 */
export function LinkRow({
  link,
  onEdit,
  onToggle,
}: {
  link: CustomLink;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  // Read straight from the map so the icon component is a fixed module value, not one made
  // during render (react-hooks/static-components).
  const Icon = LINK_ICONS[link.icon ?? 'link'] ?? LinkIcon;
  const on = link.enabled;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('ownerLinks.editA11y', { title: link.title })}
        onPress={onEdit}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.6 }]}
      >
        <Icon size={22} color={on ? theme.text : theme.meta} />
        <View style={styles.flex}>
          <Text variant="body-strong" style={!on && { color: theme.muted }} numberOfLines={1}>
            {link.title}
          </Text>
          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
            {`${shortUrl(link.url)} · ${t('ownerLinks.clicks', {
              count: link.clicks,
              n: link.clicks.toLocaleString(i18n.language),
            })}`}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('ownerLinks.editA11y', { title: link.title })}
        onPress={onEdit}
        style={({ pressed }) => [styles.icon, pressed && { backgroundColor: theme.wash }]}
      >
        <Pencil size={18} color={theme.muted} />
      </Pressable>
      <View style={styles.toggle}>
        <Toggle
          value={on}
          onChange={onToggle}
          label={t('ownerLinks.showA11y', { title: link.title })}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: tokens.space[4] },
  flex: { flex: 1, gap: 2 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: { paddingRight: tokens.space[4], paddingLeft: tokens.space[2] },
});

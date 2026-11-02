import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { OwnerPage } from '../chrome/OwnerPage';
import { NAV_ICONS } from '../chrome/NavRow';
import { moreGroups, type OwnerNavItem } from '../chrome/nav';
import { IconTile, SectionLabel } from '../kit';

export function MoreScreen() {
  const { t } = useTranslation();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  return (
    <OwnerPage title={t('owner.more')}>
      {moreGroups(role).map(({ group, items }) => (
        <View key={group} style={styles.group}>
          <SectionLabel title={t(`owner.navGroups.${group}`)} caps />
          <Group items={items} preview={group === 'previews'} />
        </View>
      ))}
    </OwnerPage>
  );
}

/** One inset grouped card: rows split by hairlines, like iOS Settings. */
function Group({ items, preview }: { items: OwnerNavItem[]; preview: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={[styles.card, { borderColor: theme.line, backgroundColor: theme.surface }]}>
      {items.map((item, index) => {
        const label = t(`owner.${item.id}`);
        const hint = t(`owner.navHints.${item.id}`);
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={preview ? `${label}, ${t('owner.preview')}` : label}
            accessibilityHint={hint}
            onPress={() => router.push(item.href as Href)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.wash }]}
          >
            <IconTile icon={NAV_ICONS[item.id]} size={36} />
            <View
              style={[
                styles.rowBody,
                index < items.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.line,
                },
              ]}
            >
              <View style={styles.copy}>
                <Text variant="body-strong">{label}</Text>
                <Text variant="caption" style={{ color: theme.muted }}>
                  {hint}
                </Text>
              </View>
              {preview ? (
                <Text
                  variant="caption"
                  style={[styles.tag, { color: theme.muted, backgroundColor: theme.wash }]}
                >
                  {t('owner.preview')}
                </Text>
              ) : null}
              <ChevronRight size={20} color={theme.meta} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: tokens.space[2] },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingLeft: tokens.space[4],
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: 60,
    paddingVertical: tokens.space[3],
    paddingRight: tokens.space[3],
  },
  copy: { flex: 1, gap: 2 },
  tag: {
    fontFamily: 'Inter_600',
    paddingHorizontal: tokens.space[2],
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
  },
});

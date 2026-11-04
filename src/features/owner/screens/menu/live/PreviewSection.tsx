import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, Pencil, Plus } from 'lucide-react-native';
import type { MenuCategory, MenuItem } from '@/lib/api/types';
import { DishRow } from '@/features/menu';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/**
 * One section of the live preview: its heading and the dishes exactly as guests see them, plus
 * the owner's edit controls. Hidden sections and dishes stay visible here, faded and labelled.
 */
export function PreviewSection({
  section,
  dishes,
  currency,
  canReorder,
  onEditDish,
  onAddDish,
  onEditSection,
  onReorder,
}: {
  section: MenuCategory;
  dishes: MenuItem[];
  currency: string;
  /** Only with "Your order"; other sorts decide the order themselves. */
  canReorder: boolean;
  onEditDish: (dish: MenuItem) => void;
  onAddDish: () => void;
  onEditSection: () => void;
  onReorder: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.section, section.hidden && styles.faded]}>
      <View style={styles.head}>
        <Text variant="title" accessibilityRole="header" style={styles.flex}>
          {section.name.en}
          {section.hidden ? ` · ${t('ownerMenu.hidden')}` : ''}
        </Text>
        {canReorder && dishes.length > 1 ? (
          <Tool label={t('ownerMenu.live.reorder', { name: section.name.en })} onPress={onReorder}>
            <ArrowUpDown size={16} color={theme.ink} />
          </Tool>
        ) : null}
        <Tool label={t('ownerMenu.editSection', { name: section.name.en })} onPress={onEditSection}>
          <Pencil size={16} color={theme.ink} />
        </Tool>
      </View>
      {dishes.map((dish) => (
        <View key={dish.id} style={dish.hidden ? styles.faded : null}>
          <DishRow item={dish} currency={currency} onOpen={() => onEditDish(dish)} onAdd={null} />
          {dish.hidden ? (
            <Text variant="caption" style={[styles.tag, { color: theme.meta }]}>
              {t('ownerMenu.live.hiddenDish')}
            </Text>
          ) : null}
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('ownerMenu.live.addTo', { name: section.name.en })}
        onPress={onAddDish}
        style={({ pressed }) => [
          styles.add,
          { borderColor: theme.ink, backgroundColor: pressed ? theme.tint : 'transparent' },
        ]}
      >
        <Plus size={16} color={theme.ink} />
        <Text variant="body-strong" style={{ color: theme.ink }}>
          {t('ownerMenu.addDish')}
        </Text>
      </Pressable>
    </View>
  );
}

function Tool({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tool, { backgroundColor: pressed ? theme.tint : theme.wash }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space[2] },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  flex: { flex: 1 },
  faded: { opacity: 0.55 },
  tag: { paddingHorizontal: tokens.space[2], paddingTop: 2 },
  tool: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    minHeight: tokens.touchTarget + tokens.space[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[2],
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: tokens.radius.md,
  },
});

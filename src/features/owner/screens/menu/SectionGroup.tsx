import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus } from 'lucide-react-native';
import type { MenuCategory, MenuItem } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cardStyle, RowMenu, StatusPill } from '../../kit';
import { MenuItemRow } from './MenuItemRow';

/**
 * One menu section as a white card: its name and dish count (and "Hidden" when guests can't see
 * it) with a ⋮ menu to add a dish here or edit the section, then its dishes as rows split by thin
 * lines. An empty section says so and offers to add the first dish.
 */
export function SectionGroup({
  section,
  name,
  total,
  dishes,
  currency,
  onAddDish,
  onEditSection,
  onEditDish,
  onToggleDish,
}: {
  /** Missing for dishes whose section was deleted. */
  section: MenuCategory | undefined;
  name: string;
  /** Every dish in the section, not just the ones the filter shows. */
  total: number;
  dishes: MenuItem[];
  currency: string;
  onAddDish: () => void;
  onEditSection: () => void;
  onEditDish: (item: MenuItem) => void;
  onToggleDish: (item: MenuItem) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.card, cardStyle(theme)]}>
      <View style={[styles.head, { borderBottomColor: theme.line }]}>
        <View style={styles.title}>
          <Text variant="title" numberOfLines={1} style={styles.name} accessibilityRole="header">
            {name}
          </Text>
          <Text
            variant="body-strong"
            style={{ color: theme.ink }}
            accessibilityLabel={t('ownerMenu.dishCount', { count: total })}
          >
            {`(${total})`}
          </Text>
          {section?.hidden ? <StatusPill label={t('ownerMenu.hidden')} tone="neutral" boxed /> : null}
        </View>
        {section ? (
          <RowMenu
            label={t('ownerMenu.sectionActions', { name })}
            actions={[
              { label: t('ownerMenu.addHere'), icon: Plus, onPress: onAddDish },
              { label: t('ownerMenu.editSectionShort'), icon: Pencil, onPress: onEditSection },
            ]}
          />
        ) : null}
      </View>
      {dishes.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ownerMenu.live.addTo', { name })}
          onPress={onAddDish}
          style={({ pressed }) => [styles.empty, pressed && { backgroundColor: theme.wash }]}
        >
          <Plus size={18} color={theme.ink} />
          <Text variant="body-strong" style={{ color: theme.ink }}>
            {t('ownerMenu.addFirst')}
          </Text>
        </Pressable>
      ) : (
        dishes.map((item, index) => (
          <Fragment key={item.id}>
            {index > 0 ? <View style={[styles.rule, { backgroundColor: theme.line }]} /> : null}
            <MenuItemRow
              item={item}
              currency={currency}
              onToggle={() => onToggleDish(item)}
              onEdit={() => onEditDish(item)}
            />
          </Fragment>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingLeft: tokens.space[4],
    paddingRight: tokens.space[3],
    paddingVertical: tokens.space[2],
    minHeight: tokens.touchTarget + tokens.space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  name: { flexShrink: 1 },
  rule: { height: StyleSheet.hairlineWidth, marginLeft: tokens.space[4] },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget + tokens.space[4],
  },
});

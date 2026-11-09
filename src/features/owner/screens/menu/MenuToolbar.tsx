import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CircleCheck, CircleOff, ListOrdered, Search, X } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle, PeriodSelect, RowMenu } from '../../kit';
import { DISH_FILTERS, type DishFilter } from './deskFilter';

/**
 * The one row above the dish list: search, a dropdown for which dishes to show (each choice
 * with its count), and a ⋮ menu for the rarer jobs: manage sections, mark everything listed
 * sold out or back on. Sections are not a second row of chips; the list itself is grouped by
 * section.
 */
export function MenuToolbar({
  query,
  onQuery,
  status,
  onStatus,
  counts,
  busy,
  onSections,
  onAllOff,
  onAllOn,
}: {
  query: string;
  onQuery: (next: string) => void;
  status: DishFilter;
  onStatus: (next: DishFilter) => void;
  counts: Record<DishFilter, number>;
  busy: boolean;
  onSections: () => void;
  onAllOff: () => void;
  onAllOn: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <View style={[styles.search, cardStyle(theme)]}>
        <Search size={18} color={theme.muted} />
        <TextInput
          value={query}
          onChangeText={onQuery}
          placeholder={t('ownerMenu.search')}
          placeholderTextColor={theme.meta}
          accessibilityLabel={t('ownerMenu.search')}
          returnKeyType="search"
          style={[styles.input, { color: theme.text }]}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ownerFeedback.clear')}
            onPress={() => onQuery('')}
            hitSlop={tokens.space[2]}
          >
            <X size={18} color={theme.muted} />
          </Pressable>
        ) : null}
      </View>
      <PeriodSelect<DishFilter>
        label={t('ownerMenu.filterLabel')}
        value={status}
        onChange={onStatus}
        options={DISH_FILTERS.map((id) => ({
          id,
          label: `${t(`ownerMenu.filter.${id}`)} (${counts[id]})`,
        }))}
      />
      <RowMenu
        label={t('ownerMenu.moreActions')}
        actions={[
          { label: t('ownerMenu.sections'), icon: ListOrdered, onPress: onSections },
          { label: t('ownerMenu.allOffShort'), icon: CircleOff, onPress: onAllOff, disabled: busy },
          { label: t('ownerMenu.allOnShort'), icon: CircleCheck, onPress: onAllOn, disabled: busy },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[3],
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: tokens.touchTarget,
    fontFamily: fontFamily.regular,
    fontSize: tokens.owner.type.body.size,
  },
});

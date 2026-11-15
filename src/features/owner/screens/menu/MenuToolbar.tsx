import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CircleCheck, CircleOff, ListOrdered, Search, X } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { fontFamily, useTheme } from '@/ui/theme';
import { ChipRow, RowMenu } from '../../kit';

/**
 * Above the dish list (design canvas): a rounded search box with a ⋮ menu beside it for the
 * rarer jobs (manage sections, mark everything listed sold out or back on), then one chip per
 * section with its dish count.
 */
export function MenuToolbar({
  query,
  onQuery,
  section,
  onSection,
  chips,
  busy,
  onSections,
  onAllOff,
  onAllOn,
}: {
  query: string;
  onQuery: (next: string) => void;
  section: string;
  onSection: (id: string) => void;
  /** "All" first, then each section in guest order, each with its dish count. */
  chips: { id: string; label: string; count: number }[];
  busy: boolean;
  onSections: () => void;
  onAllOff: () => void;
  onAllOn: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Search size={16} color={theme.muted} />
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
        <RowMenu
          label={t('ownerMenu.moreActions')}
          actions={[
            { label: t('ownerMenu.sections'), icon: ListOrdered, onPress: onSections },
            {
              label: t('ownerMenu.allOffShort'),
              icon: CircleOff,
              onPress: onAllOff,
              disabled: busy,
            },
            {
              label: t('ownerMenu.allOnShort'),
              icon: CircleCheck,
              onPress: onAllOn,
              disabled: busy,
            },
          ]}
        />
      </View>
      <ChipRow<string>
        label={t('ownerMenu.sections')}
        value={section}
        onChange={onSection}
        items={chips}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Search and the section chips read as one block, so they sit close together.
  stack: { gap: tokens.space[3] },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  // A 40 px pill, 1 px edge: slimmer than the canvas's 48 so the list starts higher.
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    height: 40,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: tokens.radius.full,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 40,
    fontFamily: fontFamily.regular,
    fontSize: 15,
  },
});

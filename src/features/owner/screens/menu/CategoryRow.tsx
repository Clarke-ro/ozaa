import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, EyeOff, Pencil, Trash2 } from 'lucide-react-native';
import type { MenuCategory } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { RowMenu } from '../../kit/RowMenu';

/**
 * What one section card shows on Categories, before the drag handle: the name with its dish
 * count in orange, "Hidden" when guests can't see it, and the ⋮ menu (edit, move, delete).
 * Move up and down stay in the menu so the order can be changed without dragging.
 */
export function CategoryRow({
  section,
  count,
  first,
  last,
  busy,
  onMove,
  onEdit,
  onDelete,
}: {
  section: MenuCategory;
  count: number;
  first: boolean;
  last: boolean;
  busy: boolean;
  onMove: (direction: 'up' | 'down') => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const name = section.name.en;

  return (
    <>
      <View style={styles.copy}>
        <View style={styles.title}>
          <Text variant="body-strong" numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          <Text
            variant="body-strong"
            style={{ color: theme.ink }}
            accessibilityLabel={t('ownerMenu.dishCount', { count })}
          >
            {`(${count})`}
          </Text>
        </View>
        {section.hidden ? (
          <View style={styles.hidden}>
            <EyeOff size={14} color={theme.muted} />
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('ownerMenu.hidden')}
            </Text>
          </View>
        ) : null}
      </View>
      <RowMenu
        label={t('ownerMenu.sectionActions', { name })}
        actions={[
          { label: t('ownerMenu.edit'), icon: Pencil, onPress: onEdit },
          {
            label: t('ownerMenu.moveUpShort'),
            icon: ArrowUp,
            onPress: () => onMove('up'),
            disabled: busy || first,
          },
          {
            label: t('ownerMenu.moveDownShort'),
            icon: ArrowDown,
            onPress: () => onMove('down'),
            disabled: busy || last,
          },
          { label: t('ownerMenu.delete'), icon: Trash2, onPress: onDelete, destructive: true },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1, gap: 2 },
  title: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[2] },
  name: {
    flexShrink: 1,
    fontSize: tokens.owner.type.rowTitle.size,
    lineHeight: tokens.owner.type.rowTitle.line,
  },
  hidden: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
});

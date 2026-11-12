import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, EyeOff, Pencil, Trash2 } from 'lucide-react-native';
import type { MenuCategory } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export type SectionsListProps = {
  sections: MenuCategory[];
  counts: Record<string, number>;
  busy: boolean;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onEdit: (section: MenuCategory) => void;
  onDelete: (section: MenuCategory) => void;
  onAdd: () => void;
};

/**
 * Sections in guest order, with move up/down, edit and delete. Arrows instead of drag, so it works
 * with a screen reader. Used in the Menu screen's Sections sheet and on the Categories page.
 */
export function SectionsList({
  sections,
  counts,
  busy,
  onMove,
  onEdit,
  onDelete,
  onAdd,
}: SectionsListProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <>
      <View style={[styles.list, { borderColor: theme.line }]}>
        {sections.map((section, index) => (
          <View
            key={section.id}
            style={[
              styles.row,
              index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
            ]}
          >
            <View style={styles.copy}>
              <Text variant="body-strong">{section.name.en}</Text>
              <Text variant="caption" style={{ color: theme.muted }}>
                {t('ownerMenu.dishCount', { count: counts[section.id] ?? 0 })}
                {section.hidden ? ` · ${t('ownerMenu.hidden')}` : ''}
              </Text>
            </View>
            {section.hidden ? <EyeOff size={16} color={theme.muted} /> : null}
            <Icon
              label={t('ownerMenu.moveUp', { name: section.name.en })}
              disabled={busy || index === 0}
              onPress={() => onMove(section.id, 'up')}
            >
              <ArrowUp size={18} color={index === 0 ? theme.meta : theme.text} />
            </Icon>
            <Icon
              label={t('ownerMenu.moveDown', { name: section.name.en })}
              disabled={busy || index === sections.length - 1}
              onPress={() => onMove(section.id, 'down')}
            >
              <ArrowDown
                size={18}
                color={index === sections.length - 1 ? theme.meta : theme.text}
              />
            </Icon>
            <Icon
              label={t('ownerMenu.editSection', { name: section.name.en })}
              onPress={() => onEdit(section)}
            >
              <Pencil size={18} color={theme.text} />
            </Icon>
            <Icon
              label={t('ownerMenu.deleteSection', { name: section.name.en })}
              onPress={() => onDelete(section)}
            >
              <Trash2 size={18} color={theme.error} />
            </Icon>
          </View>
        ))}
      </View>
      <Button label={t('ownerMenu.newSection')} tone="secondary" onPress={onAdd} />
    </>
  );
}

function Icon({
  label,
  onPress,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.icon, pressed && { backgroundColor: theme.wash }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[1],
    minHeight: 60,
    paddingLeft: tokens.space[3],
  },
  copy: { flex: 1, gap: 2, paddingVertical: tokens.space[2] },
  icon: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm,
  },
});

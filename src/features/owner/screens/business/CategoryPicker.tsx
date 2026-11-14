import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, X } from 'lucide-react-native';
import type { BusinessCategory } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

/**
 * Business categories as tags (canvas): the picked ones in order with an × to remove, then
 * "Add a category" opening the rest. The first category is the main one, shown on Google.
 */
export function CategoryPicker({
  all,
  selected,
  onChange,
}: {
  all: readonly BusinessCategory[];
  selected: BusinessCategory[];
  onChange: (next: BusinessCategory[]) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rest = all.filter((c) => !selected.includes(c));
  const name = (c: BusinessCategory) => t(`ownerBusiness.categories.${c}`);
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View style={styles.wrap}>
      <View style={[styles.box, { borderColor: theme.line, backgroundColor: theme.surface }]}>
        {selected.map((c) => (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityLabel={t('ownerBusiness.removeCategory', { name: name(c) })}
            onPress={() => onChange(selected.filter((x) => x !== c))}
            style={[styles.tag, { backgroundColor: theme.tint }]}
          >
            <Text style={[styles.tagText, { color: theme.badgeInk }]}>{name(c)}</Text>
            <X size={14} color={theme.badgeInk} strokeWidth={2.5} />
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={t('ownerBusiness.addCategory')}
          disabled={rest.length === 0}
          onPress={() => setOpen((o) => !o)}
          style={styles.add}
        >
          <Text style={[styles.addText, { color: theme.meta }]}>
            {rest.length ? t('ownerBusiness.addCategory') : ''}
          </Text>
          {rest.length ? <Chevron size={18} color={theme.text} /> : null}
        </Pressable>
      </View>
      {open && rest.length ? (
        <View style={[styles.menu, { borderColor: theme.line, backgroundColor: theme.surface }]}>
          {rest.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              onPress={() => {
                onChange([...selected, c]);
                if (rest.length === 1) setOpen(false);
              }}
              style={({ pressed }) => [styles.item, pressed && { backgroundColor: theme.wash }]}
            >
              <Text variant="body">{name(c)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2] },
  box: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: 54,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 27,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
  },
  tagText: { fontSize: 15, fontFamily: fontFamily.strong },
  add: { flex: 1, minWidth: 160, flexDirection: 'row', alignItems: 'center', gap: 6, height: 38 },
  addText: { flex: 1, fontSize: 15 },
  menu: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', paddingVertical: 4 },
  item: { paddingVertical: 10, paddingHorizontal: 16 },
});

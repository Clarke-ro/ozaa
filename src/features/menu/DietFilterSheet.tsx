import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export function DietFilterSheet({
  options,
  selected,
  onApply,
  onClear,
  onClose,
}: {
  /** Tags dishes on this menu carry (see dietOptions), standard ones first. */
  options: readonly string[];
  selected: readonly string[];
  onApply: (tags: string[]) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [draft, setDraft] = useState<string[]>([...selected]);

  return (
    <View style={[styles.backdrop, { backgroundColor: theme.scrim }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        style={StyleSheet.absoluteFill}
        onPress={onClose}
      />
      <View style={[styles.sheet, { backgroundColor: theme.white }]}>
        <Text variant="title">{t('menu.filterTitle')}</Text>
        {options.map((tag) => {
          const on = draft.includes(tag);
          return (
            <Pressable
              key={tag}
              accessibilityRole="checkbox"
              accessibilityLabel={t(`dietary.${tag}`, { defaultValue: tag })}
              accessibilityState={{ checked: on }}
              onPress={() =>
                setDraft((current) =>
                  on ? current.filter((item) => item !== tag) : [...current, tag],
                )
              }
              style={[
                styles.row,
                { borderColor: theme.line, backgroundColor: on ? theme.tint : theme.white },
              ]}
            >
              <Text variant="body-strong">{t(`dietary.${tag}`, { defaultValue: tag })}</Text>
              {on ? <Check color={theme.ink} size={18} strokeWidth={2} /> : null}
            </Pressable>
          );
        })}
        <View style={styles.actions}>
          <Button
            label={t('menu.clear')}
            tone="secondary"
            onPress={onClear}
            style={styles.action}
          />
          <Button label={t('menu.apply')} onPress={() => onApply(draft)} style={styles.action} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    justifyContent: 'flex-end',
  },
  sheet: { zIndex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10 },
  row: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  action: { flex: 1 },
});

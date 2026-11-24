import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { guestFont, useTheme } from '@/ui/theme';

// The contract's limit for Order.note.
const MAX = 200;

/**
 * "Add instructions" for the whole order (design canvas, Clarke 2026-11-24): a grey row that
 * opens into a box for the kitchen. The text goes on the order only (Order.note).
 */
export function OrderInstructions({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(value.length > 0);

  if (!open) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? theme.line : theme.wash },
        ]}
      >
        <Text variant="body-strong">{t('basket.instructions')}</Text>
        <View style={[styles.plus, { borderColor: theme.fill }]}>
          <Plus size={14} color={theme.ink} strokeWidth={2.5} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.field}>
      <Text variant="body-strong" style={styles.label}>
        {t('basket.instructionsLabel')}
      </Text>
      <TextInput
        accessibilityLabel={t('basket.instructionsLabel')}
        value={value}
        onChangeText={(text) => onChange(text.slice(0, MAX))}
        placeholder={t('basket.instructionsHint')}
        placeholderTextColor={theme.meta}
        maxLength={MAX}
        multiline
        autoFocus={value.length === 0}
        style={[styles.input, { color: theme.text, backgroundColor: theme.wash }]}
      />
      <Text variant="caption" style={[styles.count, { color: theme.meta }]}>
        {value.length}/{MAX}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 50,
    borderRadius: tokens.radius.md,
    paddingStart: tokens.space[4],
    paddingEnd: tokens.space[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plus: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: { gap: tokens.space[2] },
  label: { paddingStart: 4 },
  input: {
    minHeight: 88,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    textAlignVertical: 'top',
    fontFamily: guestFont.regular,
    fontSize: 16,
  },
  count: { alignSelf: 'flex-end' },
});

import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

/** A canvas setting row: what it is (and a grey hint) on the left, its control on the right. */
export function SettingRow({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.words}>
        <Text variant="body">{label}</Text>
        {hint ? (
          <Text variant="caption" style={{ color: theme.muted }}>
            {hint}
          </Text>
        ) : null}
        {error ? (
          <Text variant="caption" style={{ color: theme.error }}>
            {error}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** A money box on the right of a row: the currency in grey, the amount in bold. */
export function MoneyInput({
  label,
  currency,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  currency: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.money, { borderColor: theme.line, backgroundColor: theme.surface }]}>
      <Text variant="body" style={{ color: theme.meta }}>
        {currency}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={theme.meta}
        style={[styles.amount, { color: theme.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[4], minHeight: 64 },
  words: { flex: 1, minWidth: 0, gap: 2 },
  money: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    width: 176,
    height: 56,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 28,
  },
  amount: {
    flex: 1,
    minWidth: 0,
    // Fill the pill's height, so a tap anywhere on it lands in the box (a 20 px box was too small).
    alignSelf: 'stretch',
    textAlign: 'right',
    fontFamily: fontFamily.strong,
    fontSize: 17,
    padding: 0,
  },
});

import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { fontFamily, useTheme } from '@/ui/theme';
import { Text } from '@/ui/Text';

/**
 * A one-line box for typing your own tag, with an Add button. The parent decides what adding
 * means and returns an error message, or null when the tag went in (then the box clears).
 */
export function TagInput({
  label,
  placeholder,
  addLabel,
  onAdd,
}: {
  /** Read by screen readers for the text box. */
  label: string;
  placeholder: string;
  addLabel: string;
  onAdd: (text: string) => string | null;
}) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const problem = onAdd(text);
    setError(problem);
    if (!problem) setText('');
  };
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          value={text}
          onChangeText={(next) => {
            setText(next);
            if (error) setError(null);
          }}
          onSubmitEditing={submit}
          placeholder={placeholder}
          placeholderTextColor={theme.meta}
          accessibilityLabel={label}
          returnKeyType="done"
          autoCapitalize="sentences"
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: error ? theme.error : theme.line,
              backgroundColor: theme.surface,
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={addLabel}
          onPress={submit}
          style={({ pressed }) => [
            styles.add,
            { borderColor: theme.text, backgroundColor: pressed ? theme.wash : theme.surface },
          ]}
        >
          <Plus size={18} color={theme.text} />
          <Text variant="body-strong">{addLabel}</Text>
        </Pressable>
      </View>
      {error ? (
        <Text variant="caption" accessibilityRole="alert" style={{ color: theme.error }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[1] },
  row: { flexDirection: 'row', gap: tokens.space[2] },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[3],
    fontFamily: fontFamily.regular,
    fontSize: tokens.type.body.size,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[1],
    minHeight: 44,
    paddingHorizontal: tokens.space[3],
    borderWidth: 1.5,
    borderRadius: tokens.radius.md,
  },
});

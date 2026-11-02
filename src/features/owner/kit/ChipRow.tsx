import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** Rounded filter chips. The picked one is black-outlined, matching the guest menu chips. */
export function ChipRow<T extends string>({
  items,
  value,
  onChange,
}: {
  items: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((item) => {
        const on = item.id === value;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={item.label}
            onPress={() => onChange(item.id)}
            style={[
              styles.chip,
              {
                borderColor: on ? theme.black : theme.line,
                backgroundColor: on ? theme.black : theme.surface,
              },
            ]}
          >
            <Text
              variant="body-strong"
              style={{ color: on ? theme.white : theme.text, fontSize: 14 }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: tokens.space[2], paddingVertical: 2 },
  chip: {
    minHeight: 40,
    paddingHorizontal: tokens.space[4],
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    justifyContent: 'center',
  },
});

import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export type DeskTab<T extends string> = { id: T; label: string; count?: number };

/** Underlined tabs with an optional orange count badge ("To check ③ · Featured · 5"). */
export function DeskTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly DeskTab<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.bar, { borderBottomColor: theme.line }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {tabs.map((tab) => {
          const on = tab.id === value;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={tab.count === undefined ? tab.label : `${tab.label} ${tab.count}`}
              onPress={() => onChange(tab.id)}
              style={[styles.tab, on && { borderBottomColor: theme.black }]}
            >
              <Text variant="body-strong" style={{ color: on ? theme.text : theme.meta, fontSize: 16 }}>
                {tab.label}
              </Text>
              {tab.count !== undefined ? (
                on ? (
                  <View style={[styles.badge, { backgroundColor: theme.fill }]}>
                    <Text variant="caption" style={{ color: theme.onFill, fontFamily: 'Inter_600' }}>
                      {tab.count}
                    </Text>
                  </View>
                ) : (
                  <Text variant="body-strong" style={{ color: theme.meta, fontSize: 16 }}>
                    · {tab.count}
                  </Text>
                )
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: 1 },
  row: { gap: tokens.space[6] },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: 48,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});

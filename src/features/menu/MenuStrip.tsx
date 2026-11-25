import { ScrollView, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';

/** A titled row of cards that scrolls sideways, above the menu (Special offers, Most ordered). */
export function MenuStrip({
  title,
  mark,
  children,
}: {
  title: string;
  /** A small mark after the title, e.g. the offers' % badge. */
  mark?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {mark}
      </View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space[3], paddingTop: tokens.space[2] },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    paddingHorizontal: tokens.grid.mobile.margin,
  },
  row: { gap: tokens.space[3], paddingHorizontal: tokens.grid.mobile.margin },
});

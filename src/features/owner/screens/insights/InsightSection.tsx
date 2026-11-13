import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { tokens } from '@/theme/tokens';
import { cardStyle } from '../../kit';

/** One Insights section (design canvas): an 18 px title above a white card. */
export function InsightSection({
  title,
  children,
  style,
  cardStyle: inner,
}: {
  title: string;
  children: ReactNode;
  style?: ViewStyle;
  cardStyle?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.section, style]}>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      <View style={[cardStyle(theme), styles.card, inner]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space[4], minWidth: 0 },
  card: { flex: 1, padding: tokens.space[6] },
});

import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { tokens } from '@/theme/tokens';
import { cardStyle } from './cardStyle';

/** A canvas section: an 18 px title above a white card (Sales, Insights, and others). */
export function TitledSection({
  title,
  action,
  children,
  style,
  cardStyle: inner,
}: {
  title: string;
  /** Something on the right of the title, e.g. the Order value / Orders switch. */
  action?: ReactNode;
  children: ReactNode;
  style?: ViewStyle;
  cardStyle?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.section, style]}>
      <View style={styles.head}>
        <Text variant="title" accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {action}
      </View>
      <View style={[cardStyle(theme), styles.card, inner]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space[4], minWidth: 0 },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.space[3] },
  title: { flex: 1 },
  card: { flex: 1, padding: tokens.space[6] },
});

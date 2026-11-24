import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { tokens } from '@/theme/tokens';
import { useOwnerLayout } from '../chrome/layout';
import { cardStyle } from './cardStyle';

/**
 * A canvas section: an 18 px title above a white card (Sales, Insights, and others).
 * `plain` drops the card: the controls sit on the page under the title, each its own box
 * (design/brand.md section 8, clean screens).
 */
export function TitledSection({
  title,
  action,
  children,
  style,
  cardStyle: inner,
  plain,
}: {
  title: string;
  /** Something on the right of the title, e.g. the Order value / Orders switch. */
  action?: ReactNode;
  children: ReactNode;
  style?: ViewStyle;
  cardStyle?: ViewStyle;
  plain?: boolean;
}) {
  const theme = useTheme();
  // Phones: the title sits closer to a card with 16 px inside instead of 24.
  const { wide } = useOwnerLayout();
  return (
    <View style={[styles.section, !wide && styles.sectionPhone, style]}>
      <View style={styles.head}>
        <Text variant="title" accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {action}
      </View>
      {plain ? (
        <View style={styles.plain}>{children}</View>
      ) : (
        <View style={[cardStyle(theme), styles.card, !wide && styles.cardPhone, inner]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space[4], minWidth: 0 },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.space[3] },
  title: { flex: 1 },
  card: { flex: 1, padding: tokens.space[6] },
  sectionPhone: { gap: 10 },
  cardPhone: { padding: tokens.space[4] },
  plain: { gap: tokens.space[4] },
});

import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskCard } from './DeskCard';

/** Bordered number tile ("Orders 46", "Avg order GH₵54") from the dashboard render. */
export function StatTile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'up' | 'down' }) {
  const theme = useTheme();
  return (
    <DeskCard style={styles.tile}>
      <Text variant="body" style={{ color: theme.muted }} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="title" style={[styles.value, { fontVariant: ['tabular-nums'] }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {note ? (
        <View>
          <Text variant="caption" style={{ color: tone === 'up' ? theme.success : tone === 'down' ? theme.error : theme.meta }}>
            {note}
          </Text>
        </View>
      ) : null}
    </DeskCard>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 100, gap: tokens.space[2], paddingVertical: tokens.space[4] },
  value: { fontSize: 22, lineHeight: 28 },
});

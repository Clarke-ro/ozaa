import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Field } from '../../kit';
import type { planTables } from '../tables/planTables';

/** From and To, each on its own card, then one line saying which tables will be added. */
export function TablesStep({
  from,
  to,
  onFrom,
  onTo,
  plan,
  existing,
  error,
  card,
}: {
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  plan: ReturnType<typeof planTables>;
  existing: number;
  error: string | null;
  card: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <>
      <View style={styles.row}>
        <View style={[card, styles.flex]}>
          <Field
            label={t('ownerTables.from')}
            value={from}
            onChangeText={onFrom}
            keyboardType="number-pad"
          />
        </View>
        <View style={[card, styles.flex]}>
          <Field
            label={t('ownerTables.to')}
            value={to}
            onChangeText={onTo}
            keyboardType="number-pad"
          />
        </View>
      </View>
      <Text variant="caption" style={{ color: error ? theme.error : theme.muted }}>
        {error ??
          (plan.codes.length
            ? t('ownerTables.willCreate', {
                count: plan.codes.length,
                first: plan.codes[0],
                last: plan.codes.at(-1),
              })
            : t('ownerSetup.tablesExist', { count: existing }))}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space[3] },
  flex: { flex: 1 },
});

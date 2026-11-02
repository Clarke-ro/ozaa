import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Field, ModalSheet, Segmented } from '../../kit';
import { MAX_BATCH, planTables, type AddMode } from './planTables';

export function AddTablesSheet({
  visible,
  onClose,
  onAdd,
  loading,
  existing,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (codes: string[]) => void;
  loading: boolean;
  existing: readonly string[];
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [mode, setMode] = useState<AddMode>('range');
  const [start, setStart] = useState('1');
  const [end, setEnd] = useState('10');
  const [prefix, setPrefix] = useState('');
  const [list, setList] = useState('');
  const plan = planTables(mode, { start, end, prefix, list }, existing);
  const n = plan.codes.length;

  return (
    <ModalSheet visible={visible} onClose={onClose} title={t('ownerTables.addTitle')}>
      <Segmented
        label={t('ownerTables.addHow')}
        value={mode}
        onChange={setMode}
        options={[
          { id: 'range', label: t('ownerTables.byRange') },
          { id: 'list', label: t('ownerTables.byName') },
        ]}
      />
      {mode === 'range' ? (
        <>
          <View style={styles.row}>
            <Field
              label={t('ownerTables.from')}
              value={start}
              onChangeText={setStart}
              keyboardType="number-pad"
              returnKeyType="next"
            />
            <Field
              label={t('ownerTables.to')}
              value={end}
              onChangeText={setEnd}
              keyboardType="number-pad"
              returnKeyType="next"
            />
          </View>
          <Field
            label={t('ownerTables.prefix')}
            hint={t('ownerTables.prefixHint')}
            value={prefix}
            onChangeText={setPrefix}
            autoCapitalize="words"
          />
        </>
      ) : (
        <Field
          label={t('ownerTables.names')}
          hint={t('ownerTables.namesHint')}
          value={list}
          onChangeText={setList}
          multiline
          autoCapitalize="words"
        />
      )}
      {plan.error ? (
        <Text variant="body" accessibilityLiveRegion="polite" style={{ color: theme.error }}>
          {t(plan.error, { max: MAX_BATCH })}
        </Text>
      ) : n > 0 ? (
        <Text variant="body" accessibilityLiveRegion="polite" style={{ color: theme.muted }}>
          {t('ownerTables.willCreate', { count: n, first: plan.codes[0], last: plan.codes[n - 1] })}
        </Text>
      ) : null}
      <Button
        label={n > 0 ? t('ownerTables.addN', { count: n }) : t('ownerTables.addTitle')}
        onPress={() => onAdd(plan.codes)}
        loading={loading}
        disabled={n === 0}
      />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space[3] },
});

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Field, ModalSheet, toast } from '../../kit';

/**
 * Pairing in two steps: name the phone, then the server issues a one-time code that staff
 * type on that phone. The code comes from the server, never from this app.
 */
export function PairSheet({ venueId, onClose }: { venueId: string; onClose: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [showError, setShowError] = useState(false);
  const pair = useMutation({
    mutationFn: () => api.ownerPairScannerDevice(venueId, { name: name.trim() }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['owner-devices', venueId] }),
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  const code = pair.data?.pairingCode;

  return (
    <ModalSheet
      visible
      onClose={onClose}
      title={t('ownerDevices.pair')}
      footer={
        code ? (
          <Button
            label={t('ownerDevices.done')}
            tone="secondary"
            style={styles.flex}
            onPress={onClose}
          />
        ) : (
          <Button
            label={t('ownerDevices.getCode')}
            style={styles.flex}
            loading={pair.isPending}
            onPress={() => (name.trim() ? pair.mutate() : setShowError(true))}
          />
        )
      }
    >
      {code ? (
        <View
          style={[styles.code, { backgroundColor: theme.wash }]}
          accessible
          accessibilityLabel={t('ownerDevices.codeA11y', { code: code.split('').join(' ') })}
        >
          <Text variant="caption" style={{ color: theme.muted }}>
            {t('ownerDevices.codeFor', { name: pair.data?.name })}
          </Text>
          <Text variant="display-l" selectable style={styles.digits}>
            {code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code}
          </Text>
          <Text variant="body" style={[styles.center, { color: theme.muted }]}>
            {t('ownerDevices.codeHow')}
          </Text>
        </View>
      ) : (
        <Field
          label={t('ownerDevices.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('ownerDevices.nameHint')}
          error={showError && !name.trim() ? t('ownerDevices.needName') : undefined}
        />
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  code: {
    alignItems: 'center',
    gap: tokens.space[2],
    padding: tokens.space[6],
    borderRadius: tokens.radius.lg,
  },
  digits: { letterSpacing: 4, fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center' },
});

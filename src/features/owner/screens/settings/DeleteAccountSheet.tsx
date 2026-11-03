import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Field, ModalSheet, toast } from '../../kit';

// The phrase the server expects; typing it makes deletion a deliberate act (Act 843 erasure request).
const PHRASE = 'DELETE MY ACCOUNT';

export function DeleteAccountSheet({
  visible,
  onClose,
  onDeleted,
}: {
  visible: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [typed, setTyped] = useState('');
  const remove = useMutation({
    mutationFn: () => api.deleteAccount({ confirmText: PHRASE }),
    onSuccess: onDeleted,
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  return (
    <ModalSheet visible={visible} onClose={onClose} title={t('ownerSettings.deleteTitle')}>
      <Text variant="body" style={{ color: theme.muted }}>
        {t('ownerSettings.deleteBody')}
      </Text>
      <Field
        label={t('ownerSettings.deleteType', { phrase: PHRASE })}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={PHRASE}
      />
      <Button
        label={t('ownerSettings.deleteConfirm')}
        tone="destructive"
        disabled={typed.trim() !== PHRASE}
        loading={remove.isPending}
        onPress={() => remove.mutate()}
      />
      <Button label={t('ownerSettings.cancel')} tone="ghost" onPress={onClose} />
    </ModalSheet>
  );
}

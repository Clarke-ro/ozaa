import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { Field, ModalSheet, toast } from '../../kit';

/** Change the sign-in phone: a code goes to the new number, and only the right code changes it. */
export function PhoneSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  // Ghana numbers are saved as +233 and 9 digits; 024 123 4567 becomes +233241234567.
  const e164 = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    return digits.startsWith('233') ? `+${digits}` : `+233${digits.replace(/^0/, '')}`;
  };
  const request = useMutation({
    mutationFn: () => api.requestPhoneChange(e164(phone), { idempotencyKey: crypto.randomUUID() }),
    onSuccess: () => setSent(true),
    onError: () => toast.error(t('ownerSettings.phoneSendFailed')),
  });
  const confirm = useMutation({
    mutationFn: () => api.confirmPhoneChange({ phone: e164(phone), code: code.trim() }),
    onSuccess: (user) => {
      client.setQueryData(ownerKeys.me(), user);
      toast.success(t('ownerSettings.phoneChanged'));
      onClose();
    },
    onError: () => toast.error(t('ownerSettings.codeWrong')),
  });
  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={t('ownerSettings.changePhone')}
      footer={
        sent ? (
          <Button
            label={t('ownerSettings.confirm')}
            size="md"
            loading={confirm.isPending}
            disabled={!/^\d{6}$/.test(code.trim())}
            onPress={() => confirm.mutate()}
          />
        ) : (
          <Button
            label={t('ownerSettings.sendCode')}
            size="md"
            loading={request.isPending}
            disabled={phone.replace(/\D/g, '').length < 9}
            onPress={() => request.mutate()}
          />
        )
      }
    >
      <View style={styles.stack}>
        <Field
          label={t('ownerSettings.newPhone')}
          keyboardType="phone-pad"
          placeholder="024 123 4567"
          value={phone}
          onChangeText={setPhone}
          editable={!sent}
        />
        {sent ? (
          <>
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('ownerSettings.codeSent')}
            </Text>
            <Field
              label={t('ownerSettings.code')}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />
          </>
        ) : null}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({ stack: { gap: tokens.space[4] } });

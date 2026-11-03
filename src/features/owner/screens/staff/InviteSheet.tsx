import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { StaffRole } from '@/lib/api/types';
import { parsePhone } from '@/lib/phone';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Chips, Field, ModalSheet, toast } from '../../kit';

// Owners are not invited from here: a second owner can change payouts, so that stays a support step.
export const INVITE_ROLES: StaffRole[] = [
  'manager',
  'waiter',
  'kitchen',
  'viewer',
  'staff_scanner',
];

/** Invite a teammate by phone. They sign in with a code sent to that phone. */
export function InviteSheet({ venueId, onClose }: { venueId: string; onClose: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole>('waiter');
  const [showErrors, setShowErrors] = useState(false);
  const parsed = parsePhone(phone);
  const nameError = showErrors && !name.trim() ? t('ownerStaff.needName') : undefined;
  const phoneError = showErrors && !parsed ? t('ownerStaff.needPhone') : undefined;

  const invite = useMutation({
    mutationFn: () =>
      api.ownerInviteStaff(venueId, { firstName: name.trim(), phone: parsed?.phone ?? '', role }),
    onSuccess: () => {
      toast.success(t('ownerStaff.invited', { name: name.trim() }));
      void client.invalidateQueries({ queryKey: ['owner-staff', venueId] });
      onClose();
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  return (
    <ModalSheet
      visible
      onClose={onClose}
      title={t('ownerStaff.invite')}
      footer={
        <Button
          label={t('ownerStaff.sendInvite')}
          style={styles.flex}
          loading={invite.isPending}
          onPress={() => (name.trim() && parsed ? invite.mutate() : setShowErrors(true))}
        />
      }
    >
      <Field
        label={t('owner.firstName')}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        textContentType="givenName"
        error={nameError}
      />
      <Field
        label={t('owner.phone')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        placeholder="024 123 4567"
        error={phoneError}
      />
      <Text variant="body-strong">{t('owner.role')}</Text>
      <Chips
        single
        label={t('owner.role')}
        options={INVITE_ROLES.map((id) => ({ id, label: t(`ownerSettings.roles.${id}`) }))}
        selected={[role]}
        onChange={(ids) => setRole(ids[0] ?? 'waiter')}
      />
      <Text variant="caption" style={{ color: theme.muted }}>
        {t(`ownerStaff.can.${role}`)}
      </Text>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });

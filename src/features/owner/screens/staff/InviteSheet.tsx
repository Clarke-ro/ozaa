import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, ownerAuth } from '@/lib/api';
import type { StaffRole } from '@/lib/api/types';
import { parsePhone } from '@/lib/phone';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Chips, Field, ModalSheet, toast } from '../../kit';
import { ownerKeys } from '../../data/keys';

// Owners are not invited from here: a second owner can change payment settings, so that stays a support step.
export const INVITE_ROLES: StaffRole[] = [
  'manager',
  'waiter',
  'kitchen',
  'viewer',
  'staff_scanner',
];

// Real builds sign in by email code (src/lib/auth/clerkOwnerAuth.ts), so an invite needs the
// email the code goes to. The demo signs in by phone and leaves it out.
const needsEmail = ownerAuth.identifier === 'email';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Invite a teammate. They sign in with a code sent to their email (or phone in the demo). */
export function InviteSheet({ venueId, onClose }: { venueId: string; onClose: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('waiter');
  const [showErrors, setShowErrors] = useState(false);
  const parsed = parsePhone(phone);
  const nameError = showErrors && !name.trim() ? t('ownerStaff.needName') : undefined;
  const phoneError = showErrors && !parsed ? t('ownerStaff.needPhone') : undefined;
  const emailOk = !needsEmail || EMAIL.test(email.trim());
  const emailError = showErrors && !emailOk ? t('ownerStaff.needEmail') : undefined;

  const invite = useMutation({
    mutationFn: () =>
      api.ownerInviteStaff(venueId, {
        firstName: name.trim(),
        phone: parsed?.phone ?? '',
        role,
        ...(needsEmail ? { email: email.trim().toLowerCase() } : {}),
      }),
    onSuccess: () => {
      toast.success(t('ownerStaff.invited', { name: name.trim() }));
      void client.invalidateQueries({ queryKey: ownerKeys.staff(venueId) });
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
          onPress={() => (name.trim() && parsed && emailOk ? invite.mutate() : setShowErrors(true))}
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
      {needsEmail ? (
        <Field
          label={t('owner.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          placeholder="name@example.com"
          error={emailError}
        />
      ) : null}
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

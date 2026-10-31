import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { StaffRole } from '@/lib/api/types';
import { parseGhanaPhone, formatPhone } from '@/lib/phone';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';

const ROLES: StaffRole[] = ['manager', 'waiter', 'kitchen'];

export function StaffScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole>('waiter');
  const [error, setError] = useState(false);
  const staff = useQuery({ queryKey: ['owner-staff', venueId], queryFn: () => api.ownerListStaff(venueId), enabled: Boolean(venueId) });
  const invite = useMutation({
    mutationFn: () => {
      const parsed = parseGhanaPhone(phone);
      if (!parsed || !firstName.trim()) throw new Error('phone');
      return api.ownerInviteStaff(venueId, { phone: parsed.phone, role, firstName: firstName.trim() });
    },
    onSuccess: () => {
      setFirstName('');
      setPhone('');
      setError(false);
      void client.invalidateQueries({ queryKey: ['owner-staff', venueId] });
    },
    onError: () => setError(true),
  });

  return (
    <OwnerPage title={t('owner.staff')}>
      <DeskWait loading={staff.isLoading} error={staff.isError} onRetry={() => void staff.refetch()}>
        {(staff.data?.items ?? []).map((person) => (
          <View key={person.id} style={[styles.row, { borderColor: theme.line }]}>
            <Text variant="body-strong">{person.firstName}</Text>
            <Text variant="caption" style={{ color: theme.meta }}>
              {t(`owner.roles.${person.role}`)} · {person.phoneMasked}
            </Text>
          </View>
        ))}
        <TextInput accessibilityLabel={t('owner.firstName')} value={firstName} onChangeText={setFirstName} placeholder={t('owner.firstName')} style={[styles.input, { borderColor: theme.line, color: theme.text }]} />
        <TextInput
          accessibilityLabel={t('owner.phone')}
          value={phone}
          onChangeText={(value) => {
            setPhone(value);
            const parsed = parseGhanaPhone(value);
            if (parsed) setPhone(formatPhone(parsed.phone));
          }}
          placeholder={t('owner.phone')}
          keyboardType="phone-pad"
          style={[styles.input, { borderColor: theme.line, color: theme.text }]}
        />
        <View style={styles.roles}>
          {ROLES.map((value) => (
            <Pressable key={value} accessibilityRole="button" onPress={() => setRole(value)} style={[styles.role, { borderColor: role === value ? theme.black : theme.line }]}>
              <Text variant="caption">{t(`owner.roles.${value}`)}</Text>
            </Pressable>
          ))}
        </View>
        {error ? <Text>{t('errors.generic')}</Text> : null}
        <Button label={t('owner.invite')} onPress={() => invite.mutate()} loading={invite.isPending} />
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  row: { borderBottomWidth: 1, paddingVertical: tokens.space[3], gap: 4 },
  input: { borderWidth: 1, borderRadius: tokens.radius.md, minHeight: 48, paddingHorizontal: tokens.space[3] },
  roles: { flexDirection: 'row', gap: tokens.space[2] },
  role: { minHeight: 44, paddingHorizontal: tokens.space[3], borderWidth: 1, borderRadius: tokens.radius.full, justifyContent: 'center' },
});

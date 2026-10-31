import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChefHat, ShieldAlert, UserCheck, UserPlus, Users, Utensils } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { StaffRole } from '@/lib/api/types';
import { parseGhanaPhone, formatPhone } from '@/lib/phone';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { DeskCard, IconTile, SectionLabel, StatTile, StatusPill } from '../kit';

const ROLES: StaffRole[] = ['manager', 'waiter', 'kitchen'];

const ROLE_INFO: Record<StaffRole, { label: string; desc: string; icon: typeof Users }> = {
  manager: {
    label: 'Manager',
    desc: 'Full floor & kitchen access, menu changes, customer reviews, loyalty and settings.',
    icon: UserCheck,
  },
  waiter: {
    label: 'Waiter',
    desc: 'Floor tables, live orders, waiter calls queue, and register checkout.',
    icon: Utensils,
  },
  kitchen: {
    label: 'Kitchen',
    desc: 'Kitchen display ticket queue and food-ready dispatch banner only.',
    icon: ChefHat,
  },
  owner: {
    label: 'Owner',
    desc: 'Unrestricted access to all venue settings, payouts, and team invites.',
    icon: UserCheck,
  },
};

export function StaffScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole>('waiter');
  const [error, setError] = useState(false);

  const staff = useQuery({
    queryKey: ['owner-staff', venueId],
    queryFn: () => api.ownerListStaff(venueId),
    enabled: Boolean(venueId),
  });

  const invite = useMutation({
    mutationFn: () => {
      const parsed = parseGhanaPhone(phone);
      if (!parsed || !firstName.trim()) throw new Error('phone');
      return api.ownerInviteStaff(venueId, {
        phone: parsed.phone,
        role,
        firstName: firstName.trim(),
      });
    },
    onSuccess: () => {
      setFirstName('');
      setPhone('');
      setError(false);
      void client.invalidateQueries({ queryKey: ['owner-staff', venueId] });
    },
    onError: () => setError(true),
  });

  const staffList = staff.data?.items ?? [];
  const waitersCount = staffList.filter((s) => s.role === 'waiter').length;
  const kitchenCount = staffList.filter((s) => s.role === 'kitchen').length;

  return (
    <OwnerPage
      title={t('owner.staff')}
      subtitle="Invite and manage team members, role assignments, and floor access permissions."
    >
      <DeskWait loading={staff.isLoading} error={staff.isError} onRetry={() => void staff.refetch()}>
        {/* Top metrics summary */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <StatTile label="Total staff" value={String(staffList.length)} note="Active accounts" />
          </View>
          <View style={styles.statCol}>
            <StatTile label="Waiters & floor" value={String(waitersCount)} note="Serving tables" />
          </View>
          <View style={styles.statCol}>
            <StatTile label="Kitchen & prep" value={String(kitchenCount)} note="Order tickets" />
          </View>
        </View>

        {/* Staff list */}
        <SectionLabel
          title={`TEAM MEMBERS (${staffList.length})`}
          caps
        />

        <View style={styles.staffGrid}>
          {staffList.map((person) => {
            const roleDetails = ROLE_INFO[person.role as StaffRole] ?? ROLE_INFO.waiter;
            const initials = person.firstName.slice(0, 2).toUpperCase();
            return (
              <DeskCard key={person.id} style={styles.staffCard}>
                <View style={styles.staffMainRow}>
                  <View style={styles.avatarCircle}>
                    <Text variant="body-strong" style={styles.avatarText}>
                      {initials}
                    </Text>
                  </View>

                  <View style={styles.staffInfo}>
                    <View style={styles.staffNameRow}>
                      <Text variant="body-strong">{person.firstName}</Text>
                      <StatusPill
                        tone={person.role === 'manager' ? 'accent' : person.role === 'kitchen' ? 'waiting' : 'neutral'}
                        label={t(`owner.roles.${person.role}`)}
                        boxed
                      />
                    </View>
                    <Text variant="caption" style={{ color: theme.meta }}>
                      {person.phoneMasked}
                    </Text>
                  </View>
                </View>

                <View style={styles.roleDescBox}>
                  <Text variant="caption" style={{ color: '#4B5563' }}>
                    {roleDetails.desc}
                  </Text>
                </View>
              </DeskCard>
            );
          })}
        </View>

        {/* Invite new staff card */}
        <DeskCard style={styles.inviteCard}>
          <View style={styles.inviteHeader}>
            <IconTile icon={UserPlus} tone="tint" size={36} />
            <View>
              <Text variant="title">Invite team member</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Staff sign in securely via phone OTP. No passwords needed.
              </Text>
            </View>
          </View>

          {/* First Name Field */}
          <View style={styles.fieldBlock}>
            <Text variant="caption" style={styles.fieldLabel}>
              {t('owner.firstName')}
            </Text>
            <TextInput
              accessibilityLabel={t('owner.firstName')}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="e.g. Kwame or Ama"
              placeholderTextColor={theme.meta}
              style={[styles.input, { borderColor: theme.line, color: theme.text }]}
            />
          </View>

          {/* Phone Field */}
          <View style={styles.fieldBlock}>
            <Text variant="caption" style={styles.fieldLabel}>
              {t('owner.phone')} (Ghana mobile)
            </Text>
            <TextInput
              accessibilityLabel={t('owner.phone')}
              value={phone}
              onChangeText={(value) => {
                setPhone(value);
                const parsed = parseGhanaPhone(value);
                if (parsed) setPhone(formatPhone(parsed.phone));
              }}
              placeholder="024 123 4567"
              placeholderTextColor={theme.meta}
              keyboardType="phone-pad"
              style={[styles.input, { borderColor: theme.line, color: theme.text }]}
            />
          </View>

          {/* Role selector */}
          <View style={styles.fieldBlock}>
            <Text variant="caption" style={styles.fieldLabel}>
              {t('owner.role')}
            </Text>
            <View style={styles.rolesRow}>
              {ROLES.map((value) => {
                const isSelected = role === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={t(`owner.roles.${value}`)}
                    onPress={() => setRole(value)}
                    style={[
                      styles.roleTile,
                      {
                        borderColor: isSelected ? theme.black : theme.line,
                        backgroundColor: isSelected ? '#111111' : '#FFFFFF',
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{
                        color: isSelected ? '#FFFFFF' : theme.text,
                        fontWeight: '700',
                      }}
                    >
                      {t(`owner.roles.${value}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text variant="caption" style={{ color: theme.meta }}>
              {ROLE_INFO[role]?.desc}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <ShieldAlert size={16} color="#DC2626" />
              <Text variant="caption" style={{ color: '#DC2626', fontWeight: '600' }}>
                Please check the phone number. A valid Ghana number is required.
              </Text>
            </View>
          ) : null}

          <Button
            label={t('owner.invite')}
            onPress={() => invite.mutate()}
            loading={invite.isPending}
            disabled={!firstName.trim() || !phone.trim()}
          />
        </DeskCard>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  statCol: {
    flex: 1,
    minWidth: 100,
  },
  staffGrid: {
    gap: tokens.space[2],
  },
  staffCard: {
    gap: tokens.space[2],
  },
  staffMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarText: {
    color: '#111111',
    fontWeight: '800',
    fontSize: 16,
  },
  staffInfo: {
    flex: 1,
    gap: 2,
  },
  staffNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleDescBox: {
    backgroundColor: '#F9FAFB',
    padding: tokens.space[2],
    borderRadius: tokens.radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#D24000',
  },
  inviteCard: {
    gap: tokens.space[3],
    marginTop: tokens.space[2],
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    minHeight: 48,
    paddingHorizontal: tokens.space[3],
    backgroundColor: '#FFFFFF',
  },
  rolesRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  roleTile: {
    minHeight: 40,
    paddingHorizontal: tokens.space[4],
    borderWidth: 1,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: tokens.space[2],
    backgroundColor: '#FEF2F2',
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
});

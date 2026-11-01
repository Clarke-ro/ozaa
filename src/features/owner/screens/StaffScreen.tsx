import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ChefHat,
  Eye,
  ScanLine,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Utensils,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import type { StaffMember, StaffRole } from '@/lib/api/types';
import { parseGhanaPhone, formatPhone } from '@/lib/phone';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { ConfirmDialog, DeskCard, EmptyCard, IconTile, SectionLabel, StatTile, StatusPill } from '../kit';

const ALL_ROLES: StaffRole[] = ['manager', 'waiter', 'kitchen', 'viewer', 'staff_scanner', 'owner'];

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
  viewer: {
    label: 'Viewer',
    desc: 'Read-only access to sales reports, customer feedback and live floor.',
    icon: Eye,
  },
  staff_scanner: {
    label: 'Scanner',
    desc: 'Dedicated camera scanner access to verify cards, stamp visits and redeem rewards.',
    icon: ScanLine,
  },
};

export function StaffScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [contact, setContact] = useState('');
  const [role, setRole] = useState<StaffRole>('waiter');
  const [error, setError] = useState(false);
  const [staffToRevoke, setStaffToRevoke] = useState<StaffMember | null>(null);

  const staff = useQuery({
    queryKey: ['owner-staff', venueId],
    queryFn: () => api.ownerListStaff(venueId),
    enabled: Boolean(venueId),
  });

  const invite = useMutation({
    mutationFn: () => {
      const isEmail = contact.includes('@');
      let phoneArg = contact.trim();
      if (!isEmail) {
        const parsed = parseGhanaPhone(contact);
        if (!parsed) throw new Error('invalid_phone');
        phoneArg = parsed.phone;
      }
      if (!firstName.trim()) throw new Error('missing_name');

      return api.ownerInviteStaff(venueId, {
        phone: phoneArg,
        role,
        firstName: firstName.trim(),
      });
    },
    onSuccess: () => {
      setFirstName('');
      setContact('');
      setError(false);
      void client.invalidateQueries({ queryKey: ['owner-staff', venueId] });
    },
    onError: () => setError(true),
  });

  const revokeMutation = useMutation({
    mutationFn: (staffId: string) => api.ownerRevokeStaff(venueId, staffId),
    onSuccess: () => {
      setStaffToRevoke(null);
      void client.invalidateQueries({ queryKey: ['owner-staff', venueId] });
    },
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

        {staffList.length === 0 ? (
          <EmptyCard
            icon={Users}
            title="No team members yet"
            description="Invite your waitstaff, kitchen team and floor managers below."
          />
        ) : (
          <View style={styles.staffGrid}>
            {staffList.map((person) => {
              const roleDetails = ROLE_INFO[person.role as StaffRole] ?? ROLE_INFO.waiter;
              const initials = person.firstName.slice(0, 2).toUpperCase();
              const isOwnerRole = person.role === 'owner';
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
                          tone={
                            person.role === 'manager'
                              ? 'accent'
                              : person.role === 'kitchen'
                              ? 'waiting'
                              : person.role === 'owner'
                              ? 'success'
                              : 'neutral'
                          }
                          label={roleDetails.label}
                          boxed
                        />
                      </View>
                      <Text variant="caption" style={{ color: theme.meta }}>
                        {person.phoneMasked}
                      </Text>
                    </View>

                    {!isOwnerRole ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Revoke access for ${person.firstName}`}
                        onPress={() => setStaffToRevoke(person)}
                        style={[styles.revokeBtn, { borderColor: theme.line }]}
                      >
                        <Trash2 size={16} color="#DC2626" />
                      </Pressable>
                    ) : null}
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
        )}

        {/* Invite new staff card */}
        <DeskCard style={styles.inviteCard}>
          <View style={styles.inviteHeader}>
            <IconTile icon={UserPlus} tone="tint" size={36} />
            <View style={{ flex: 1 }}>
              <Text variant="title">Invite team member</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Staff sign in securely via phone OTP or email. No passwords needed.
              </Text>
            </View>
          </View>

          {/* First Name Field */}
          <View style={styles.fieldBlock}>
            <Text variant="caption" style={styles.fieldLabel}>
              {t('owner.firstName')} *
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

          {/* Phone / Email Field */}
          <View style={styles.fieldBlock}>
            <Text variant="caption" style={styles.fieldLabel}>
              Ghana Phone or Email *
            </Text>
            <TextInput
              accessibilityLabel="Contact phone or email"
              value={contact}
              onChangeText={(value) => {
                setContact(value);
                if (!value.includes('@')) {
                  const parsed = parseGhanaPhone(value);
                  if (parsed) setContact(formatPhone(parsed.phone));
                }
              }}
              placeholder="024 123 4567 or staff@venue.com"
              placeholderTextColor={theme.meta}
              keyboardType="email-address"
              style={[styles.input, { borderColor: theme.line, color: theme.text }]}
            />
          </View>

          {/* Role selector */}
          <View style={styles.fieldBlock}>
            <Text variant="caption" style={styles.fieldLabel}>
              {t('owner.role')}
            </Text>
            <View style={styles.rolesRow}>
              {ALL_ROLES.map((value) => {
                const isSelected = role === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={ROLE_INFO[value]?.label ?? value}
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
                      {ROLE_INFO[value]?.label ?? value}
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
                Please check the contact details. A valid Ghana number or email is required.
              </Text>
            </View>
          ) : null}

          <Button
            label={t('owner.invite')}
            onPress={() => invite.mutate()}
            loading={invite.isPending}
            disabled={!firstName.trim() || !contact.trim()}
          />
        </DeskCard>

        {/* Revoke confirmation dialog */}
        <ConfirmDialog
          visible={Boolean(staffToRevoke)}
          title={`Revoke Access for ${staffToRevoke?.firstName}?`}
          message="This team member will immediately lose access to this venue and will no longer be able to view orders, tables or settings."
          confirmLabel="Revoke Access"
          cancelLabel="Cancel"
          destructive
          loading={revokeMutation.isPending}
          onConfirm={() => {
            if (staffToRevoke) {
              revokeMutation.mutate(staffToRevoke.id);
            }
          }}
          onCancel={() => setStaffToRevoke(null)}
        />
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
    gap: tokens.space[2],
  },
  revokeBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
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
    flexWrap: 'wrap',
  },
  roleTile: {
    minHeight: 38,
    paddingHorizontal: tokens.space[3],
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

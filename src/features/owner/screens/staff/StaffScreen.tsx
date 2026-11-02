import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Users } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { StaffMember } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ConfirmDialog, EmptyCard, ModalSheet, Section, StatusPill, toast } from '../../kit';
import { InviteSheet } from './InviteSheet';

/** Who can sign in to this venue and what each person can do. */
export function StaffScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const key = ['owner-staff', venueId];
  const staff = useQuery({
    queryKey: key,
    queryFn: () => api.ownerListStaff(venueId),
    enabled: Boolean(venueId),
  });
  const [inviting, setInviting] = useState(false);
  const [open, setOpen] = useState<StaffMember | null>(null);
  const [confirm, setConfirm] = useState(false);

  const remove = useMutation({
    mutationFn: (id: string) => api.ownerRevokeStaff(venueId, id),
    onSuccess: () => {
      toast.success(t('ownerStaff.removed'));
      setConfirm(false);
      setOpen(null);
      void client.invalidateQueries({ queryKey: key });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  const members = (staff.data?.items ?? []).filter((m) => m.status !== 'removed');

  return (
    <OwnerPage
      title={t('owner.staff')}
      action={
        <Button
          label={t('ownerStaff.invite')}
          tone="secondary"
          size="md"
          onPress={() => setInviting(true)}
        />
      }
    >
      <DeskWait
        loading={staff.isLoading}
        error={staff.isError}
        onRetry={() => void staff.refetch()}
      >
        {members.length === 0 ? (
          <EmptyCard
            icon={Users}
            title={t('ownerStaff.empty')}
            description={t('ownerStaff.emptyBody')}
            actionLabel={t('ownerStaff.invite')}
            onAction={() => setInviting(true)}
          />
        ) : (
          <Section title={t('ownerStaff.team', { count: members.length })}>
            {members.map((m) => (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={`${m.firstName}, ${t(`ownerSettings.roles.${m.role}`)}${m.status === 'invited' ? `, ${t('ownerStaff.pending')}` : ''}`}
                onPress={() => setOpen(m)}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.wash }]}
              >
                <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
                  <Text variant="body-strong" style={{ color: theme.badgeInk }}>
                    {m.firstName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.flex}>
                  <Text variant="body-strong">{m.firstName}</Text>
                  <Text variant="caption" style={{ color: theme.muted }}>
                    {t(`ownerSettings.roles.${m.role}`)} · {m.phoneMasked}
                  </Text>
                </View>
                {m.status === 'invited' ? (
                  <StatusPill label={t('ownerStaff.pending')} tone="waiting" boxed icon={false} />
                ) : null}
                <ChevronRight size={18} color={theme.meta} />
              </Pressable>
            ))}
          </Section>
        )}
      </DeskWait>

      {inviting ? <InviteSheet venueId={venueId} onClose={() => setInviting(false)} /> : null}
      {open ? (
        <ModalSheet
          visible
          onClose={() => setOpen(null)}
          title={open.firstName}
          subtitle={`${t(`ownerSettings.roles.${open.role}`)} · ${open.phoneMasked}`}
        >
          <Text variant="body" style={{ color: theme.muted }}>
            {t(`ownerStaff.can.${open.role}`)}
          </Text>
          {open.role === 'owner' ? null : (
            <Button
              label={t('ownerStaff.remove', { name: open.firstName })}
              tone="secondary"
              onPress={() => setConfirm(true)}
            />
          )}
        </ModalSheet>
      ) : null}
      <ConfirmDialog
        visible={confirm && open !== null}
        destructive
        title={t('ownerStaff.removeTitle', { name: open?.firstName ?? '' })}
        message={t('ownerStaff.removeBody')}
        confirmLabel={t('ownerStaff.removeConfirm')}
        loading={remove.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => open && remove.mutate(open.id)}
      />
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 60,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
});

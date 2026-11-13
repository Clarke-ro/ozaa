import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { StaffMember } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import {
  CardGrid,
  ChipRow,
  ConfirmDialog,
  EmptyCard,
  FigureRow,
  InfoRow,
  ModalSheet,
  cardStyle,
  toast,
} from '../../kit';
import { useOwnerLayout } from '../../chrome/layout';
import { StaffCard } from './StaffCard';
import { InviteSheet } from './InviteSheet';
import { ownerKeys } from '../../data/keys';

type Show = 'all' | 'onShift' | 'invited';
const ROLES = ['owner', 'manager', 'waiter', 'kitchen'] as const;

/**
 * Who can sign in to this venue and what each person can do (design canvas): three figures, chips
 * for everyone / on shift / invited, one row per person, then what each role can open.
 */
export function StaffScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const key = ownerKeys.staff(venueId);
  const staff = useQuery({
    queryKey: key,
    queryFn: () => api.ownerListStaff(venueId),
    enabled: Boolean(venueId),
  });
  const { wide, desktop } = useOwnerLayout();
  const [show, setShow] = useState<Show>('all');
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
  const sorted = [...members].sort(
    (a, b) =>
      Number(b.onShift ?? false) - Number(a.onShift ?? false) ||
      Number(a.status === 'invited') - Number(b.status === 'invited') ||
      a.firstName.localeCompare(b.firstName),
  );

  const counts: Record<Show, number> = {
    all: members.length,
    onShift: members.filter((m) => m.onShift).length,
    invited: members.filter((m) => m.status === 'invited').length,
  };
  const shown = sorted.filter((m) =>
    show === 'all' ? true : show === 'onShift' ? m.onShift : m.status === 'invited',
  );

  return (
    <OwnerPage
      title={t('owner.staff')}
      subtitle={t('ownerLead.staff')}
      action={<Button label={t('ownerStaff.inviteSomeone')} onPress={() => setInviting(true)} />}
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
          <View style={styles.stack}>
            <FigureRow
              wide={wide}
              items={[
                { label: t('ownerStaff.onShiftNow'), value: String(counts.onShift) },
                { label: t('ownerStaff.inTeam'), value: String(counts.all) },
                { label: t('ownerStaff.invitesWaiting'), value: String(counts.invited) },
              ]}
            />
            <View style={styles.people}>
              <ChipRow<Show>
                label={t('ownerFloor.filter.label')}
                value={show}
                onChange={setShow}
                items={(['all', 'onShift', 'invited'] as const).map((id) => ({
                  id,
                  label: t(`ownerStaff.show.${id}`),
                  count: counts[id],
                }))}
              />
              <View style={styles.list}>
                {shown.map((m) => (
                  <StaffCard
                    key={m.id}
                    member={m}
                    now={now}
                    wide={wide}
                    onPress={() => setOpen(m)}
                  />
                ))}
              </View>
            </View>
            <View style={styles.people}>
              <Text variant="title" accessibilityRole="header">
                {t('ownerStaff.rolesTitle')}
              </Text>
              <CardGrid columns={desktop ? 4 : 2} gap={tokens.owner.controls.listGap}>
                {ROLES.map((role) => (
                  <View key={role} style={[cardStyle(theme), styles.role]}>
                    <Text style={styles.roleName}>{t(`ownerSettings.roles.${role}`)}</Text>
                    <Text style={[styles.roleText, { color: theme.muted }]}>
                      {t(`ownerStaff.can.${role}`)}
                    </Text>
                  </View>
                ))}
              </CardGrid>
            </View>
          </View>
        )}
      </DeskWait>

      {inviting ? <InviteSheet venueId={venueId} onClose={() => setInviting(false)} /> : null}
      {open ? (
        <ModalSheet
          visible
          onClose={() => setOpen(null)}
          title={[open.firstName, open.lastName].filter(Boolean).join(' ')}
          subtitle={`${t(`ownerSettings.roles.${open.role}`)} · ${open.phoneMasked}`}
        >
          {open.joinedAt ? (
            <InfoRow
              label={t('ownerStaff.joined')}
              value={new Date(open.joinedAt).toLocaleDateString(i18n.language, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            />
          ) : null}
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
  // Canvas: 56 px between the figures, the people and the roles; 20 px under each heading.
  stack: { gap: tokens.owner.controls.todayGap },
  people: { gap: tokens.owner.controls.headGap },
  list: { gap: tokens.owner.controls.listGap },
  role: {
    flex: 1,
    gap: 4,
    paddingVertical: 18,
    paddingHorizontal: tokens.owner.controls.cardPadding,
  },
  roleName: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.strong },
  roleText: { fontSize: 14, lineHeight: 20 },
});

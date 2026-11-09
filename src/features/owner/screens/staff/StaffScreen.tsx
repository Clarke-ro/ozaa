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
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ConfirmDialog, EmptyCard, InfoRow, ModalSheet, SectionLabel, toast } from '../../kit';
import { SummaryStrip } from '../../kit/SummaryStrip';
import { StaffCard } from './StaffCard';
import { InviteSheet } from './InviteSheet';
import { ownerKeys } from '../../data/keys';

/** Who can sign in to this venue and what each person can do. */
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

  return (
    <OwnerPage
      title={t('owner.staff')} subtitle={t('ownerLead.staff')}
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
          <View style={styles.stack}>
            <SummaryStrip
              items={[
                {
                  label: t('ownerStaff.onShift'),
                  value: String(members.filter((m) => m.onShift).length),
                },
                { label: t('ownerStaff.teamShort'), value: String(members.length) },
                {
                  label: t('ownerStaff.pending'),
                  value: String(members.filter((m) => m.status === 'invited').length),
                },
              ]}
            />
            <SectionLabel title={t('ownerStaff.team', { count: members.length })} caps />
            <View style={styles.list}>
              {sorted.map((m) => (
                <View key={m.id}>
                  <StaffCard member={m} now={now} onPress={() => setOpen(m)} />
                </View>
              ))}
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
  stack: { gap: tokens.space[3] },
  list: { gap: tokens.space[3] },
});

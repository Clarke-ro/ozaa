import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SearchX } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { useOwnerLayout } from '../../chrome/layout';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import {
  cardStyle,
  ConfirmDialog,
  EmptyCard,
  FigureRow,
  TitledSection,
  toast,
  ToneTag,
} from '../../kit';

/**
 * One person on the team (canvas): who they are and whether they are on shift, what they did
 * today, their role and what it can open, and Remove. The contract has no calls yet to change a
 * role, assign tables or reset a PIN, so those parts of the canvas are not shown.
 */
export function StaffDetailScreen({ memberId }: { memberId: string }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const client = useQueryClient();
  const { wide } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const key = ownerKeys.staff(venueId);
  const staff = useQuery({
    queryKey: key,
    queryFn: () => api.ownerListStaff(venueId),
    enabled: Boolean(venueId),
  });
  const [confirm, setConfirm] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/owner/staff'));
  const remove = useMutation({
    mutationFn: (id: string) => api.ownerRevokeStaff(venueId, id),
    onSuccess: () => {
      toast.success(t('ownerStaff.removed'));
      setConfirm(false);
      void client.invalidateQueries({ queryKey: key });
      router.replace('/owner/staff');
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  const m = staff.data?.items.find((x) => x.id === memberId && x.status !== 'removed');
  const name = m ? [m.firstName, m.lastName].filter(Boolean).join(' ') : '';
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  const joined = m?.joinedAt
    ? new Date(m.joinedAt).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })
    : null;
  const pickup = m?.today?.avgPickupMinutes;

  return (
    <OwnerPage
      title={m ? name : t('owner.staff')}
      subtitle={m ? t(`ownerSettings.roles.${m.role}`) : undefined}
      back={{ label: t('owner.staff'), onPress: back }}
    >
      <DeskWait
        loading={staff.isLoading}
        error={staff.isError}
        onRetry={() => void staff.refetch()}
      >
        {m ? (
          <View style={styles.stack}>
            <View style={styles.group}>
              <View style={[cardStyle(theme), styles.card]}>
                <View style={[styles.avatar, { backgroundColor: theme.wash }]}>
                  <Text style={styles.initials}>{initials}</Text>
                </View>
                <View style={styles.flex}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {name}
                    </Text>
                    {m.status === 'invited' ? (
                      <ToneTag label={t('ownerStaff.invitedTag')} tone="bill" />
                    ) : m.onShift ? (
                      <ToneTag label={t('ownerStaff.onShift')} tone="success" />
                    ) : null}
                  </View>
                  <Text variant="caption" style={{ color: theme.muted }}>
                    {[m.phoneMasked, joined ? t('ownerStaff.joinedOn', { date: joined }) : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              </View>
              {m.today ? (
                <FigureRow
                  wide={wide}
                  items={[
                    {
                      label: t('ownerStaff.ordersToday'),
                      short: t('ownerShort.orders'),
                      value: String(m.today.ordersHandled),
                    },
                    {
                      label: t('ownerStaff.callsAnswered'),
                      short: t('ownerShort.calls'),
                      value: String(m.today.callsAnswered),
                    },
                    {
                      label: t('ownerStaff.avgReply'),
                      short: t('ownerShort.reply'),
                      value: pickup == null ? '–' : t('ownerCalls.minutes', { count: pickup }),
                    },
                  ]}
                />
              ) : null}
            </View>
            <TitledSection title={t('ownerStaff.role')} cardStyle={styles.pad}>
              <Text variant="body-strong">{t(`ownerSettings.roles.${m.role}`)}</Text>
              <Text variant="caption" style={{ color: theme.muted }}>
                {t(`ownerStaff.can.${m.role}`)}
              </Text>
            </TitledSection>
            {m.role === 'owner' ? null : (
              <Button
                label={t('ownerStaff.removeFromStaff')}
                tone="secondary"
                labelColor={theme.error}
                onPress={() => setConfirm(true)}
                style={styles.start}
              />
            )}
          </View>
        ) : (
          <EmptyCard
            icon={SearchX}
            title={t('ownerStaff.missing')}
            description={t('ownerStaff.missingBody')}
            actionLabel={t('owner.staff')}
            onAction={back}
          />
        )}
      </DeskWait>
      <ConfirmDialog
        visible={confirm && m != null}
        destructive
        title={t('ownerStaff.removeTitle', { name: m?.firstName ?? '' })}
        message={t('ownerStaff.removeBody')}
        confirmLabel={t('ownerStaff.removeConfirm')}
        loading={remove.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => m && remove.mutate(m.id)}
      />
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.owner.controls.sectionGap },
  group: { gap: tokens.space[5] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.owner.controls.cardPadding,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 15, fontFamily: fontFamily.strong },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  name: { fontSize: 18, lineHeight: 24, fontFamily: fontFamily.strong, flexShrink: 1 },
  pad: { padding: tokens.owner.controls.cardPadding, gap: 4 },
  start: { alignSelf: 'flex-start', minHeight: 40 },
});

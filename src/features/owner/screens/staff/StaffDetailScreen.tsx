import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
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
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { StaffAccess } from './StaffAccess';
import { useStaffActions } from './useStaffActions';
import { cardStyle, ConfirmDialog, EmptyCard, FigureRow, ToneTag } from '../../kit';

/**
 * One person on the team (canvas): who they are and End shift, what they did today, their role,
 * the tables they look after, their sign-in PIN, and Remove.
 */
export function StaffDetailScreen({ memberId }: { memberId: string }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { wide } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const staff = useQuery({
    queryKey: ownerKeys.staff(venueId),
    queryFn: () => api.ownerListStaff(venueId),
    enabled: Boolean(venueId),
  });
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const [confirm, setConfirm] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/owner/staff'));
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
  const tips = m?.today?.tipsPesewas;
  const actions = useStaffActions(venueId, memberId);
  const money = (v: number) => formatMoney(pesewas(v), venue.data?.currency);

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
                {m.onShift && m.role !== 'owner' ? (
                  <Button
                    label={t('ownerStaff.endShift')}
                    tone="secondary"
                    loading={actions.endShift.isPending}
                    onPress={() => actions.endShift.mutate()}
                    style={styles.short}
                  />
                ) : null}
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
                    // Tips only show once the server reports them (succeeded payments only).
                    ...(tips != null
                      ? [
                          {
                            label: t('ownerStaff.tipsToday'),
                            short: t('ownerStaff.tipsShort'),
                            value: money(tips),
                          },
                        ]
                      : []),
                  ]}
                />
              ) : null}
            </View>
            <StaffAccess venueId={venueId} member={m} actions={actions} />
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
        loading={actions.remove.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() =>
          actions.remove.mutate(undefined, {
            onSuccess: () => {
              setConfirm(false);
              router.replace('/owner/staff');
            },
          })
        }
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
  short: { minHeight: 40 },
  start: { alignSelf: 'flex-start', minHeight: 40 },
});

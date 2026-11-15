import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { StaffMember, StaffRole } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { Chips, Segmented, TitledSection } from '../../kit';
import type { useStaffActions } from './useStaffActions';

type Editable = Exclude<StaffRole, 'owner'>;
// The roles the canvas offers. Nobody is made owner here; the owner's own role is shown, not edited.
const ROLES: Editable[] = ['manager', 'waiter', 'kitchen'];

/** Role, the tables they look after, and their sign-in PIN (canvas). Each change saves at once. */
export function StaffAccess({
  venueId,
  member,
  actions,
}: {
  venueId: string;
  member: StaffMember;
  actions: ReturnType<typeof useStaffActions>;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const tables = useQuery({
    queryKey: ownerKeys.tables(venueId),
    queryFn: () => api.ownerListTables(venueId),
    enabled: Boolean(venueId),
  });
  const owner = member.role === 'owner';
  const picked = member.tableCodes ?? [];
  return (
    <View style={styles.stack}>
      <TitledSection title={t('ownerStaff.role')} cardStyle={styles.card}>
        {owner ? (
          <Text variant="body-strong">{t('ownerSettings.roles.owner')}</Text>
        ) : (
          <Segmented<Editable>
            equal
            label={t('ownerStaff.role')}
            value={member.role as Editable}
            onChange={(role) => actions.update.mutate({ role })}
            options={ROLES.map((id) => ({ id, label: t(`ownerSettings.roles.${id}`) }))}
          />
        )}
        <Text variant="caption" style={{ color: theme.muted }}>
          {t(`ownerStaff.can.${member.role}`)}
        </Text>
      </TitledSection>
      {member.role === 'waiter' && tables.data?.items.length ? (
        <TitledSection title={t('ownerStaff.tables')} cardStyle={styles.card}>
          <Chips<string>
            label={t('ownerStaff.tables')}
            selected={picked}
            onChange={(tableCodes) => actions.update.mutate({ tableCodes })}
            options={tables.data.items.map((x) => ({
              id: x.code,
              label: x.label ?? t('ownerOrders.table', { code: x.code }),
            }))}
          />
          <Text variant="caption" style={{ color: theme.muted }}>
            {picked.length ? t('ownerStaff.tablesHint') : t('ownerStaff.tablesAll')}
          </Text>
        </TitledSection>
      ) : null}
      {owner ? null : (
        <TitledSection title={t('ownerStaff.signIn')} cardStyle={styles.card}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text variant="body">{t('ownerStaff.pin')}</Text>
              <Text variant="caption" style={{ color: theme.muted }}>
                {member.hasPin
                  ? t('ownerStaff.pinSet', { name: member.firstName })
                  : t('ownerStaff.pinNone', { name: member.firstName })}
              </Text>
            </View>
            {member.hasPin ? (
              <Button
                label={t('ownerStaff.resetPin')}
                tone="secondary"
                loading={actions.resetPin.isPending}
                onPress={() => actions.resetPin.mutate()}
                style={styles.short}
              />
            ) : null}
          </View>
        </TitledSection>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.owner.controls.sectionGap },
  card: { padding: tokens.owner.controls.cardPadding, gap: tokens.space[3] },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  short: { minHeight: 40 },
});

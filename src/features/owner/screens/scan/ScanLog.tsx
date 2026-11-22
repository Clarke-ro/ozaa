import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Gift, Stamp } from 'lucide-react-native';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { cardStyle, SectionLabel } from '../../kit';

/** Stamps and rewards given in the last day, newest first, with who gave them. */
export function ScanLog({ venueId, since }: { venueId: string; since: string }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const log = useQuery({
    queryKey: ownerKeys.scans(venueId),
    queryFn: () => api.ownerListLoyaltyScans(venueId, since),
    enabled: Boolean(venueId),
  });
  const items = log.data?.items ?? [];
  return (
    <View style={styles.group}>
      <SectionLabel title={t('ownerScan.today')} />
      {items.length === 0 ? (
        <Text variant="body" style={{ color: theme.muted }}>
          {log.isPending ? '' : t('ownerScan.noneToday')}
        </Text>
      ) : (
        <View style={cardStyle(theme)}>
          {items.map((row, index) => {
            const Icon = row.action === 'reward' ? Gift : Stamp;
            return (
              <View
                key={row.id}
                style={[
                  styles.row,
                  index > 0 && {
                    borderTopColor: theme.line,
                    borderTopWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Icon size={20} color={theme.text} />
                <View style={styles.flex}>
                  <Text variant="body-strong" numberOfLines={1}>
                    {row.customerName}
                  </Text>
                  <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
                    {[
                      row.action === 'reward'
                        ? row.reward
                        : t('ownerScan.stampTo', { count: row.stampsAfter ?? 0 }),
                      row.by,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <Text variant="caption" style={{ color: theme.muted }}>
                  {new Date(row.at).toLocaleTimeString(i18n.language, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: tokens.space[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 60,
    paddingHorizontal: tokens.space[5],
  },
  flex: { flex: 1, minWidth: 0, gap: 2 },
});

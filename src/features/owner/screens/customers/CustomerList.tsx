import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Search, Users, X } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { useOwnerLayout } from '../../chrome/layout';
import { DeskWait } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { CardGrid, EmptyCard, SectionLabel, Toggle } from '../../kit';
import { CustomerCard } from './CustomerCard';
import { customersCsv } from './customersCsv';

/**
 * Loyalty members: search, an offers filter and a CSV export on top, then one small card per
 * member (two across on wide screens). A card opens that member's own page. Used by Customers
 * and by Loyalty > Members.
 */
export function CustomerList({ venueId }: { venueId: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { wide } = useOwnerLayout();
  const [search, setSearch] = useState('');
  const [offersOnly, setOffersOnly] = useState(false);
  const query = useDebouncedValue(search.trim());
  const customers = useQuery({
    queryKey: [...ownerKeys.loyaltyCustomers(venueId), query, offersOnly],
    queryFn: () =>
      api.ownerListLoyaltyCustomers(venueId, {
        search: query || undefined,
        wantsOffers: offersOnly ? true : undefined,
      }),
    enabled: Boolean(venueId),
    placeholderData: keepPreviousData,
  });
  const items = customers.data?.items ?? [];
  const total = customers.data?.totalCount ?? items.length;

  const exportCsv = async () => {
    if (items.length === 0) return;
    const csv = customersCsv(items);
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `cravins-loyalty-members-${venueId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      await Share.share({ message: csv, title: t('ownerMembers.exportTitle') });
    }
  };

  return (
    <DeskWait
      loading={customers.isLoading}
      error={customers.isError}
      onRetry={() => void customers.refetch()}
    >
      <View style={styles.stack}>
        <View style={styles.controls}>
          <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Search size={18} color={theme.meta} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('ownerMembers.search')}
              placeholderTextColor={theme.meta}
              accessibilityLabel={t('ownerMembers.search')}
              style={[styles.input, { color: theme.text }]}
            />
            {search ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('ownerMembers.clearSearch')}
                onPress={() => setSearch('')}
                hitSlop={tokens.space[3]}
              >
                <X size={16} color={theme.meta} />
              </Pressable>
            ) : null}
          </View>
          <View style={[styles.filter, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text variant="caption" style={styles.filterLabel}>
              {t('ownerMembers.optInShort')}
            </Text>
            <Toggle
              value={offersOnly}
              onChange={setOffersOnly}
              label={t('ownerMembers.optInFilter')}
            />
          </View>
          <Button
            label={t('ownerMembers.export')}
            tone="secondary"
            size="md"
            onPress={() => void exportCsv()}
            disabled={items.length === 0}
          />
        </View>

        <SectionLabel title={t('ownerMembers.count', { count: total })} caps />

        {items.length === 0 ? (
          <EmptyCard
            icon={Users}
            title={search ? t('ownerMembers.noMatchTitle') : t('ownerMembers.emptyTitle')}
            description={search ? t('ownerMembers.noMatchBody') : t('ownerMembers.emptyBody')}
          />
        ) : (
          <CardGrid columns={wide ? 2 : 1}>
            {items.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onOpen={() => router.push(`/owner/customers/${customer.id}`)}
              />
            ))}
          </CardGrid>
        )}
      </View>
    </DeskWait>
  );
}

const CONTROL_HEIGHT = tokens.touchTarget;

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  controls: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space[2] },
  search: {
    flexGrow: 1,
    flexBasis: tokens.space[16] * 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    height: CONTROL_HEIGHT,
    paddingHorizontal: tokens.space[3],
    borderWidth: 1,
    borderRadius: tokens.radius.md,
  },
  input: { flex: 1, fontFamily: fontFamily.regular, fontSize: tokens.owner.type.body.size },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    height: CONTROL_HEIGHT,
    paddingHorizontal: tokens.space[3],
    borderWidth: 1,
    borderRadius: tokens.radius.md,
  },
  filterLabel: { fontFamily: fontFamily.strong },
});

import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { CustomerTag } from '@/lib/api/types';
import { FilterChips } from '@/ui/FilterChips';
import { Search, Users, X } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { fontFamily, useTheme } from '@/ui/theme';
import { DeskWait } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { EmptyCard } from '../../kit';
import { Text } from '@/ui/Text';
import { CustomerCard } from './CustomerCard';
import { customersCsv } from './customersCsv';

/**
 * Loyalty members (design canvas): a full-width search (name or last 4 digits), tag chips with
 * counts, then one row per member and a note about what is shown. Customers puts Export CSV in
 * its header; Loyalty > Members keeps it beside the search. A row opens that member's page.
 */
type TagFilter = 'all' | CustomerTag;
const TAGS: readonly CustomerTag[] = ['reward_ready', 'regular', 'new', 'quiet'];

export function CustomerList({
  venueId,
  showExport = true,
}: {
  venueId: string;
  /** False when the page has its own Export CSV in the header. */
  showExport?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState<TagFilter>('all');
  const query = useDebouncedValue(search.trim());
  const customers = useQuery({
    queryKey: [...ownerKeys.loyaltyCustomers(venueId), query, tag],
    queryFn: () =>
      api.ownerListLoyaltyCustomers(venueId, {
        search: query || undefined,
        tag: tag === 'all' ? undefined : tag,
      }),
    enabled: Boolean(venueId),
    placeholderData: keepPreviousData,
  });
  const items = customers.data?.items ?? [];
  const program = useQuery({
    queryKey: ownerKeys.loyalty(venueId),
    queryFn: () => api.ownerGetLoyalty(venueId),
    enabled: Boolean(venueId),
  });
  const [now] = useState(() => Date.now());
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
          <View
            style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.line }]}
          >
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
                style={styles.xHit}
              >
                <X size={16} color={theme.meta} />
              </Pressable>
            ) : null}
          </View>
          {showExport ? (
            <Button
              label={t('ownerMembers.export')}
              tone="secondary"
              onPress={() => void exportCsv()}
              disabled={items.length === 0}
            />
          ) : null}
        </View>

        {/* Tags come from what guests did (visits, rewards, time away), never typed in. */}
        <FilterChips<TagFilter>
          label={t('ownerMembers.filter')}
          value={tag}
          onChange={setTag}
          gutter={0}
          items={[
            { id: 'all', label: t('ownerMembers.tags.all'), count: total },
            ...TAGS.map((id) => ({
              id,
              label: t(`ownerMembers.tags.${id}`),
              count: customers.data?.countsByTag?.[id] ?? 0,
            })),
          ]}
        />

        {items.length === 0 ? (
          <EmptyCard
            icon={Users}
            title={
              search || tag !== 'all'
                ? t('ownerMembers.noMatchTitle')
                : t('ownerMembers.emptyTitle')
            }
            description={
              search || tag !== 'all' ? t('ownerMembers.noMatchBody') : t('ownerMembers.emptyBody')
            }
          />
        ) : (
          <View style={styles.rows}>
            {items.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                now={now}
                stampsRequired={program.data?.stampsRequired}
                onOpen={() => router.push(`/owner/customers/${customer.id}`)}
              />
            ))}
          </View>
        )}
        <Text style={[styles.note, { color: theme.meta }]}>{t('ownerMembers.footnote')}</Text>
      </View>
    </DeskWait>
  );
}

const CONTROL_HEIGHT = tokens.owner.controls.height;

const styles = StyleSheet.create({
  // A 16 px icon in a 32 px tap area; the negative margin keeps the row's layout unchanged. Web
  // ignores hitSlop, so the box itself has to be big enough.
  xHit: { width: 32, height: 32, margin: -8, alignItems: 'center', justifyContent: 'center' },
  stack: { gap: tokens.space[4] },
  rows: { gap: tokens.owner.controls.listGap },
  note: { fontSize: 14, lineHeight: 20 },
  controls: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space[2] },
  search: {
    flexGrow: 1,
    flexBasis: tokens.space[16] * 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    // Canvas search: a 48 px pill.
    height: CONTROL_HEIGHT,
    paddingHorizontal: tokens.owner.controls.cardPadding,
    borderWidth: 1,
    borderRadius: tokens.radius.full,
  },
  // Fills the pill's height, so a tap anywhere on the pill lands in the field.
  input: { flex: 1, alignSelf: 'stretch', fontFamily: fontFamily.regular, fontSize: tokens.owner.type.body.size },
});

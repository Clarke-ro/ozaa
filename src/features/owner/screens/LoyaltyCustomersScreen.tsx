import { makeStyles } from '@/ui/makeStyles';
import { useState } from 'react';
import { Platform, Pressable, Share, TextInput, View, useWindowDimensions } from 'react-native';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Award, ChevronRight, Search, Sparkles, Users, X } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import type { LoyaltyCustomerSummary } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait } from '../chrome/OwnerPage';
import { EmptyCard, ModalSheet, SectionLabel, Toggle } from '../kit';
import { ownerKeys } from '../data/keys';

export function LoyaltyCustomersScreen({ venueId }: { venueId: string }) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const twoCol = width >= 920;

  const [search, setSearch] = useState('');
  const [wantsOffersOnly, setWantsOffersOnly] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomerSummary | null>(null);

  const query = useDebouncedValue(search.trim());
  const customersQuery = useQuery({
    queryKey: [...ownerKeys.loyaltyCustomers(venueId), query, wantsOffersOnly],
    queryFn: () =>
      api.ownerListLoyaltyCustomers(venueId, {
        search: query || undefined,
        wantsOffers: wantsOffersOnly ? true : undefined,
      }),
    enabled: Boolean(venueId),
    placeholderData: keepPreviousData,
  });

  const items = customersQuery.data?.items ?? [];
  const totalCount = customersQuery.data?.totalCount ?? items.length;

  const handleExportCsv = async () => {
    if (items.length === 0) return;
    const header = 'Phone,Name,Stamps,Rewards Available,Marketing Opt-In,Last Stamp\n';
    const rows = items
      .map(
        (c) =>
          `"${c.phoneMasked}","${c.name ?? ''}",${c.stamps},${c.rewardsAvailable},${c.wantsOffers ? 'YES' : 'NO'},"${c.lastStampAt}"`,
      )
      .join('\n');
    const csvContent = header + rows;

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `cravins-loyalty-members-${venueId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      await Share.share({
        message: csvContent,
        title: t('ownerMembers.exportTitle'),
      });
    }
  };

  return (
    <DeskWait
      loading={customersQuery.isLoading}
      error={customersQuery.isError}
      onRetry={() => void customersQuery.refetch()}
    >
      <View style={styles.stack}>
        <View style={styles.controlsBar}>
          <View style={styles.searchBox}>
            <Search size={18} color={theme.meta} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('ownerMembers.search')}
              placeholderTextColor={theme.meta}
              style={[styles.searchInput, { color: theme.text }]}
            />
            {search ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('ownerMembers.clearSearch')}
                onPress={() => setSearch('')}
                hitSlop={14}
              >
                <X size={16} color={theme.meta} />
              </Pressable>
            ) : null}
          </View>

          <View
            style={[styles.filterPill, { backgroundColor: theme.surface, borderColor: theme.line }]}
          >
            <Text variant="caption" style={{ fontWeight: '600' }}>
              {t('ownerMembers.optInTitle')}
            </Text>
            <Toggle
              value={wantsOffersOnly}
              onChange={(val) => setWantsOffersOnly(val)}
              label={t('ownerMembers.optInFilter')}
            />
          </View>

          <Button
            label={t('ownerMembers.export')}
            tone="secondary"
            size="md"
            onPress={handleExportCsv}
            disabled={items.length === 0}
          />
        </View>

        <SectionLabel title={t('ownerMembers.count', { count: totalCount })} caps />

        {items.length === 0 ? (
          <EmptyCard
            icon={Users}
            title={search ? t('ownerMembers.noMatchTitle') : t('ownerMembers.emptyTitle')}
            description={search ? t('ownerMembers.noMatchBody') : t('ownerMembers.emptyBody')}
          />
        ) : (
          <View style={[styles.customersList, twoCol && styles.customersGrid]}>
            {items.map((cust) => {
              const displayName = cust.name || cust.phoneMasked;
              return (
                <View key={cust.id} style={twoCol ? styles.customerCell : undefined}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={displayName}
                    onPress={() => setSelectedCustomer(cust)}
                    style={[styles.customerCard, { borderColor: theme.line }]}
                  >
                    <View style={styles.customerMainRow}>
                      <View style={styles.customerAvatar}>
                        <Text variant="body-strong" style={{ color: theme.fill }}>
                          {displayName.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.customerMeta}>
                        <View style={styles.nameBadgeRow}>
                          <Text variant="title" style={styles.nameText}>
                            {displayName}
                          </Text>
                          {cust.rewardsAvailable > 0 ? (
                            <View style={[styles.readyPill, { backgroundColor: theme.warningTint }]}>
                              <Sparkles size={12} color={theme.warning} />
                              <Text
                                variant="caption"
                                style={{ color: theme.warning, fontWeight: '700' }}
                              >
                                {t('ownerMembers.rewardsReady', { count: cust.rewardsAvailable })}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <Text variant="caption" style={{ color: theme.meta }}>
                          {t('ownerMembers.lastVisit', {
                            phone: cust.phoneMasked,
                            date: new Date(cust.lastStampAt).toLocaleDateString(),
                          })}
                        </Text>
                      </View>

                      <View style={styles.stampBadgeCol}>
                        <View style={[styles.stampPill, { backgroundColor: theme.fill }]}>
                          <Award size={14} color={theme.onFill} />
                          <Text variant="caption" style={{ color: theme.onFill, fontWeight: '800' }}>
                            {t('ownerMembers.stamps', { count: cust.stamps })}
                          </Text>
                        </View>
                      </View>

                      <ChevronRight size={18} color={theme.meta} />
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <ModalSheet
          visible={Boolean(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          title={
            selectedCustomer?.name || selectedCustomer?.phoneMasked || t('ownerMembers.profile')
          }
          subtitle={t('ownerMembers.activeStamps', { count: selectedCustomer?.stamps ?? 0 })}
        >
          {selectedCustomer ? (
            <View style={styles.modalContent}>
              <View style={[styles.kpiRow, { backgroundColor: theme.wash }]}>
                <View style={styles.kpiCol}>
                  <Text variant="display-m" style={{ color: theme.fill }}>
                    {selectedCustomer.stamps}
                  </Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    {t('ownerMembers.currentStamps')}
                  </Text>
                </View>

                <View style={styles.kpiCol}>
                  <Text
                    variant="display-m"
                    style={{
                      color: selectedCustomer.rewardsAvailable > 0 ? theme.success : theme.meta,
                    }}
                  >
                    {selectedCustomer.rewardsAvailable}
                  </Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    {t('ownerMembers.unclaimed')}
                  </Text>
                </View>
              </View>

              <View style={[styles.optInNotice, { borderColor: theme.line }]}>
                <Text variant="body-strong">{t('ownerMembers.marketingStatus')}</Text>
                <Text
                  variant="caption"
                  style={{ color: selectedCustomer.wantsOffers ? theme.success : theme.meta }}
                >
                  {selectedCustomer.wantsOffers
                    ? t('ownerMembers.consented')
                    : t('ownerMembers.optedOut')}
                </Text>
              </View>

              <View style={styles.manualActions}>
                <Button
                  label={t('ownerMembers.stampAtScan')}
                  tone="secondary"
                  onPress={() => {
                    setSelectedCustomer(null);
                    router.push('/owner/scan');
                  }}
                />
              </View>
            </View>
          ) : null}
        </ModalSheet>
      </View>
    </DeskWait>
  );
}

const useStyles = makeStyles((theme) => ({
  stack: { gap: tokens.space[4] },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  searchBox: {
    flex: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[3],
    height: 44,
    gap: tokens.space[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: tokens.space[2],
  },
  customersList: {
    gap: tokens.space[3],
  },
  customersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  customerCell: {
    flexBasis: '48.5%',
    flexGrow: 1,
  },
  customerCard: {
    padding: tokens.space[3],
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    backgroundColor: theme.surface,
    boxShadow: tokens.shadow.card,
  },
  customerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    backgroundColor: theme.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerMeta: {
    flex: 1,
    gap: 2,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  nameText: {
    fontSize: 16,
    lineHeight: 22,
  },
  readyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  stampBadgeCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  stampPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
  },
  modalContent: {
    gap: tokens.space[4],
  },
  kpiRow: {
    flexDirection: 'row',
    borderRadius: tokens.radius.md,
    padding: tokens.space[4],
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  kpiCol: {
    alignItems: 'center',
    gap: 2,
  },
  optInNotice: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    gap: 4,
  },
  manualActions: {
    gap: tokens.space[2],
    paddingTop: tokens.space[2],
  },
}));

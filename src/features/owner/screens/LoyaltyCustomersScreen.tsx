import { makeStyles } from '@/ui/makeStyles';
import { useState } from 'react';
import { Platform, Pressable, Share, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, ChevronRight, Search, Sparkles, Users, X } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { LoyaltyCustomerSummary } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait } from '../chrome/OwnerPage';
import { EmptyCard, ModalSheet, SectionLabel, Toggle } from '../kit';

export function LoyaltyCustomersScreen({ venueId }: { venueId: string }) {
  const styles = useStyles();
  const theme = useTheme();
  const client = useQueryClient();

  const [search, setSearch] = useState('');
  const [wantsOffersOnly, setWantsOffersOnly] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomerSummary | null>(null);

  const customersQuery = useQuery({
    queryKey: ['owner-loyalty-customers', venueId, search, wantsOffersOnly],
    queryFn: () =>
      api.ownerListLoyaltyCustomers(venueId, {
        search: search.trim() || undefined,
        wantsOffers: wantsOffersOnly ? true : undefined,
      }),
    enabled: Boolean(venueId),
  });

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['owner-loyalty-customers', venueId] });
    void client.invalidateQueries({ queryKey: ['owner-loyalty', venueId] });
  };

  // Manual stamp mutation
  const stampMutation = useMutation({
    mutationFn: (phone: string) =>
      api.ownerScanLoyaltyCard(venueId, { qrPayload: phone, action: 'stamp' }),
    onSuccess: (res) => {
      refresh();
      if (selectedCustomer) {
        setSelectedCustomer({
          ...selectedCustomer,
          stamps: res.stamps,
        });
      }
    },
  });

  // Manual redeem mutation
  const redeemMutation = useMutation({
    mutationFn: (phone: string) =>
      api.ownerScanLoyaltyCard(venueId, { qrPayload: phone, action: 'redeem' }),
    onSuccess: (res) => {
      refresh();
      if (selectedCustomer) {
        setSelectedCustomer({
          ...selectedCustomer,
          stamps: res.stamps,
          rewardsAvailable: Math.max(0, selectedCustomer.rewardsAvailable - 1),
        });
      }
    },
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
      link.setAttribute('download', `ozaa-loyalty-members-${venueId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      await Share.share({
        message: csvContent,
        title: 'Ozaa Loyalty Members Export',
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
        {/* Search & Marketing Filter Controls */}
        <View style={styles.controlsBar}>
          <View style={styles.searchBox}>
            <Search size={18} color={theme.meta} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by diner phone or name..."
              placeholderTextColor={theme.meta}
              style={[styles.searchInput, { color: theme.text }]}
            />
            {search ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setSearch('')}
                hitSlop={14}
              >
                <X size={16} color={theme.meta} />
              </Pressable>
            ) : null}
          </View>

          <Button
            label="Export CSV"
            tone="secondary"
            onPress={handleExportCsv}
            disabled={items.length === 0}
          />
        </View>

        {/* Marketing Filter Toggle Strip */}
        <View
          style={[styles.filterStrip, { backgroundColor: theme.wash, borderColor: theme.line }]}
        >
          <View style={styles.filterTextCol}>
            <Text variant="body-strong">Act 843 Compliant Marketing Opt-In</Text>
            <Text variant="caption" style={{ color: theme.meta }}>
              Show only customers who explicitly agreed to receive broadcast SMS promotions.
            </Text>
          </View>

          <Toggle
            value={wantsOffersOnly}
            onChange={(val) => setWantsOffersOnly(val)}
            label="Filter by opt-in"
          />
        </View>

        {/* Customer Count Header */}
        <SectionLabel title={`ENROLLED DINERS (${totalCount})`} caps />

        {items.length === 0 ? (
          <EmptyCard
            icon={Users}
            title={search ? 'No customers match your search' : 'No loyalty members enrolled yet'}
            description={
              search
                ? 'Check the phone number or clear search filters.'
                : 'When diners scan your table QR and claim their pass, they appear here.'
            }
          />
        ) : (
          <View style={styles.customersList}>
            {items.map((cust) => {
              const displayName = cust.name || cust.phoneMasked;
              return (
                <Pressable
                  key={cust.id}
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
                              {cust.rewardsAvailable} Reward{cust.rewardsAvailable > 1 ? 's' : ''}{' '}
                              Ready!
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <Text variant="caption" style={{ color: theme.meta }}>
                        {cust.phoneMasked} • Last visit{' '}
                        {new Date(cust.lastStampAt).toLocaleDateString()}
                      </Text>
                    </View>

                    {/* Stamp counter badge */}
                    <View style={styles.stampBadgeCol}>
                      <View style={[styles.stampPill, { backgroundColor: theme.fill }]}>
                        <Award size={14} color={theme.onFill} />
                        <Text variant="caption" style={{ color: theme.onFill, fontWeight: '800' }}>
                          {cust.stamps} Stamps
                        </Text>
                      </View>
                    </View>

                    <ChevronRight size={18} color={theme.meta} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Customer Detail & Manual Action Modal */}
        <ModalSheet
          visible={Boolean(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          title={selectedCustomer?.name || selectedCustomer?.phoneMasked || 'Diner Profile'}
          subtitle={`Member with ${selectedCustomer?.stamps ?? 0} active stamps`}
        >
          {selectedCustomer ? (
            <View style={styles.modalContent}>
              <View style={[styles.kpiRow, { backgroundColor: theme.wash }]}>
                <View style={styles.kpiCol}>
                  <Text variant="display-m" style={{ color: theme.fill }}>
                    {selectedCustomer.stamps}
                  </Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Current Stamps
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
                    Unclaimed Rewards
                  </Text>
                </View>
              </View>

              {/* Marketing Opt-In Status */}
              <View style={[styles.optInNotice, { borderColor: theme.line }]}>
                <Text variant="body-strong">Act 843 Marketing Status</Text>
                <Text
                  variant="caption"
                  style={{ color: selectedCustomer.wantsOffers ? theme.success : theme.meta }}
                >
                  {selectedCustomer.wantsOffers
                    ? '✓ Consented to promotional WhatsApp & SMS updates'
                    : '✕ Opted out of marketing promotions'}
                </Text>
              </View>

              {/* Manual Manager Actions */}
              <View style={styles.manualActions}>
                <Button
                  label="+1 Stamp (Manual Credit)"
                  tone="primary"
                  onPress={() => stampMutation.mutate(selectedCustomer.phoneMasked)}
                  loading={stampMutation.isPending}
                />

                <Button
                  label="Redeem Reward Free Dish"
                  tone="secondary"
                  onPress={() => redeemMutation.mutate(selectedCustomer.phoneMasked)}
                  loading={redeemMutation.isPending}
                  disabled={selectedCustomer.rewardsAvailable <= 0 && selectedCustomer.stamps < 10}
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
    minWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.space[3],
    height: 44,
    gap: tokens.space[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: tokens.space[3],
  },
  filterTextCol: {
    flex: 1,
    gap: 2,
  },
  customersList: {
    gap: tokens.space[2],
  },
  customerCard: {
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    backgroundColor: theme.surface,
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

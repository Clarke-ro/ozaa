import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, QrCode, X } from 'lucide-react-native';
import { api } from '@/lib/api';
import { qrModules } from '@/lib/qrSvg';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { CodeTile, DeskCard, IconTile, SectionLabel, StatTile } from '../kit';

export function TablesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const [codes, setCodes] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const tables = useQuery({
    queryKey: ['owner-tables', venueId],
    queryFn: () => api.ownerListTables(venueId),
    enabled: Boolean(venueId),
  });

  const venue = useQuery({
    queryKey: ['owner-venue', venueId],
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });

  const add = useMutation({
    mutationFn: () =>
      api.ownerCreateTables(venueId, {
        codes: codes
          .split(',')
          .map((code) => code.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      setCodes('');
      void client.invalidateQueries({ queryKey: ['owner-tables', venueId] });
    },
  });

  const items = tables.data?.items ?? [];
  const open = items.find((table) => table.id === openId) ?? null;

  return (
    <OwnerPage
      title={t('owner.tables')}
      subtitle="Manage scannable table QR codes. Print tent cards or download stickers for your venue."
    >
      <DeskWait loading={tables.isLoading} error={tables.isError} onRetry={() => void tables.refetch()}>
        {/* Top metrics summary */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <StatTile label="Total tables" value={String(items.length)} note="Active on floor" />
          </View>
          <View style={styles.statCol}>
            <StatTile label="QR codes" value={String(items.length)} note="Unique links generated" />
          </View>
          <View style={styles.statCol}>
            <StatTile label="Print batch" value="Ready" note="Stickers & acrylic cards" />
          </View>
        </View>

        {/* Selected table QR tent card preview */}
        {open?.qrUrl ? (
          <DeskCard style={styles.tentCardWrapper}>
            <View style={styles.tentCardHeader}>
              <View style={styles.tentCardTitleRow}>
                <IconTile icon={QrCode} tone="tint" size={36} />
                <View>
                  <Text variant="title">{open.label ?? `Table ${open.code}`}</Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Tent card & sticker preview
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close preview"
                onPress={() => setOpenId(null)}
                style={styles.closeBtn}
              >
                <X size={18} color={theme.text} />
              </Pressable>
            </View>

            {/* Realistic Table Tent Card Mockup */}
            <View style={styles.tentCardMockup}>
              <View style={styles.tentCardTopBorder} />
              <View style={styles.tentCardInner}>
                <Image
                  source={require('../../../../assets/images/icon.png')}
                  style={styles.logo}
                  accessibilityIgnoresInvertColors
                />
                <Text variant="caption" style={styles.brandSubtitle}>
                  POWERED BY OZAA
                </Text>
                <Text variant="title" style={styles.venueNameOnCard}>
                  {venue.data?.name ?? 'Restaurant'}
                </Text>

                <View style={styles.bigCodePill}>
                  <Text variant="display-m" style={styles.bigCodeText}>
                    {open.label ?? `Table ${open.code}`}
                  </Text>
                </View>

                {/* Sharp QR code */}
                <View style={styles.qrContainer}>
                  <QrMark url={open.qrUrl} />
                </View>

                <Text variant="caption" style={styles.scanInstruction}>
                  Scan with your phone camera to view menu, call waiter & pay
                </Text>

                <Text variant="caption" style={styles.directUrl}>
                  {open.qrUrl}
                </Text>
              </View>
            </View>

            <View style={styles.tentCardActions}>
              {Platform.OS === 'web' ? (
                <Button
                  label={t('owner.printQr')}
                  onPress={() => window.print()}
                />
              ) : (
                <Button
                  label={t('owner.printQr')}
                  onPress={() => {}}
                />
              )}
            </View>
          </DeskCard>
        ) : null}

        {/* Table list */}
        <SectionLabel
          title={`ALL TABLES (${items.length})`}
          caps
        />

        <View style={styles.tableGrid}>
          {items.map((table) => {
            const isSelected = table.id === openId;
            const labelText = table.label ?? `Table ${table.code}`;
            return (
              <Pressable
                key={table.id}
                accessibilityRole="button"
                accessibilityLabel={labelText}
                onPress={() => setOpenId(table.id)}
                style={[
                  styles.tableCard,
                  {
                    borderColor: isSelected ? theme.fill : theme.line,
                    backgroundColor: isSelected ? '#FFF8F5' : theme.white,
                  },
                ]}
              >
                <View style={styles.tableCardHeader}>
                  <CodeTile code={table.code} />
                  <View style={styles.tableCardMeta}>
                    <Text variant="body-strong">{labelText}</Text>
                    <Text variant="caption" style={{ color: theme.meta }} numberOfLines={1}>
                      {table.qrUrl}
                    </Text>
                  </View>
                </View>

                <View style={styles.tableCardBottom}>
                  <View style={styles.qrIndicator}>
                    <QrCode size={13} color={theme.fill} />
                    <Text variant="caption" style={{ color: theme.fill, fontWeight: '600' }}>
                      QR Active
                    </Text>
                  </View>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Tap to view
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Add tables card */}
        <DeskCard style={styles.addCard}>
          <View style={styles.addCardHeader}>
            <IconTile icon={Plus} tone="tint" size={36} />
            <View>
              <Text variant="title">Add new tables</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                {t('owner.tableCodes')}
              </Text>
            </View>
          </View>

          <TextInput
            accessibilityLabel={t('owner.tableCodes')}
            value={codes}
            onChangeText={setCodes}
            placeholder="e.g. 9, 10, 11 or Patio 1, Patio 2"
            placeholderTextColor={theme.meta}
            style={[styles.input, { borderColor: theme.line, color: theme.text }]}
          />

          <Button
            label={t('owner.addTables')}
            tone="secondary"
            onPress={() => add.mutate()}
            loading={add.isPending}
            disabled={!codes.trim()}
          />
        </DeskCard>
      </DeskWait>
    </OwnerPage>
  );
}

function QrMark({ url }: { url: string }) {
  const drawn = qrModules(url, 180);
  return (
    <Svg width={180} height={180} viewBox={`0 0 ${drawn.size} ${drawn.size}`}>
      <Rect width={drawn.size} height={drawn.size} fill="#FFFFFF" />
      <Path d={drawn.path} fill="#111111" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  statCol: {
    flex: 1,
    minWidth: 100,
  },
  tableGrid: {
    gap: tokens.space[2],
  },
  tableCard: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    gap: tokens.space[2],
  },
  tableCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  tableCardMeta: {
    flex: 1,
  },
  tableCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: tokens.space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F0F0F0',
  },
  qrIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tentCardWrapper: {
    gap: tokens.space[3],
    borderWidth: 2,
    borderColor: '#D24000',
  },
  tentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tentCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  closeBtn: {
    padding: 6,
    borderRadius: tokens.radius.sm,
    backgroundColor: '#F5F5F5',
  },
  tentCardMockup: {
    backgroundColor: '#FFFFFF',
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    overflow: 'hidden',
  },
  tentCardTopBorder: {
    height: 6,
    backgroundColor: '#D24000',
    width: '100%',
  },
  tentCardInner: {
    alignItems: 'center',
    padding: tokens.space[4],
    gap: tokens.space[2],
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#888888',
  },
  venueNameOnCard: {
    fontSize: 20,
    fontWeight: '700',
  },
  bigCodePill: {
    backgroundColor: '#111111',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[1],
    borderRadius: tokens.radius.full,
    marginVertical: 4,
  },
  bigCodeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
  qrContainer: {
    padding: tokens.space[2],
    backgroundColor: '#FFFFFF',
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  scanInstruction: {
    textAlign: 'center',
    maxWidth: 240,
    color: '#444444',
    lineHeight: 18,
  },
  directUrl: {
    color: '#999999',
    fontSize: 11,
  },
  tentCardActions: {
    paddingTop: tokens.space[1],
  },
  addCard: {
    gap: tokens.space[3],
    marginTop: tokens.space[2],
  },
  addCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    minHeight: 48,
    paddingHorizontal: tokens.space[3],
    backgroundColor: '#FFFFFF',
  },
});

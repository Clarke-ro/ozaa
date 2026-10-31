import { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Layers,
  Palette,
  Plus,
  Printer,
  QrCode,
  Share2,
  Trash2,
  X,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import type { Table } from '@/lib/api/types';
import { qrModules } from '@/lib/qrSvg';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { generateTableCodes } from '@/features/tables/tableRange';
import { generateTableCardHtml, type TableCardTemplate } from '@/features/tables/tablePdf';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import {
  CodeTile,
  ConfirmDialog,
  DeskCard,
  EmptyCard,
  Field,
  IconTile,
  ModalSheet,
  SectionLabel,
  StatTile,
} from '../kit';

export function TablesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();

  // Customizer state
  const [template, setTemplate] = useState<TableCardTemplate>('folded_tent');
  const [accentColor, setAccentColor] = useState('#D24000');
  const [ctaMessage, setCtaMessage] = useState('Scan for Menu, Waiter & Pay');

  // Selected table for preview
  const [openId, setOpenId] = useState<string | null>(null);

  // Modals state
  const [rangeModalOpen, setRangeModalOpen] = useState(false);
  const [singleAddModalOpen, setSingleAddModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Table | null>(null);

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

  const refresh = () => void client.invalidateQueries({ queryKey: ['owner-tables', venueId] });

  const addBatchMutation = useMutation({
    mutationFn: (codes: string[]) => api.ownerCreateTables(venueId, { codes }),
    onSuccess: () => {
      setRangeModalOpen(false);
      setSingleAddModalOpen(false);
      refresh();
    },
  });

  const items = tables.data?.items ?? [];
  const open = items.find((table) => table.id === openId) ?? items[0] ?? null;

  // Print single card or batch of cards
  const handlePrint = (singleTable?: Table) => {
    const venueName = venue.data?.name ?? 'Ozaa Restaurant';
    const targets = singleTable ? [singleTable] : items;
    if (targets.length === 0) return;

    const html = generateTableCardHtml(
      targets,
      {
        template,
        accentColor,
        ctaText: ctaMessage,
      },
      venueName
    );

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
      }
    } else {
      // In mobile environment, fall back or announce
      alert('Printing ready. Open on web to print high-resolution vector cards.');
    }
  };

  return (
    <OwnerPage
      title={t('owner.tables')}
      subtitle="Manage table QR codes. Print beautiful acrylic tent cards or stickers for your venue."
    >
      <DeskWait loading={tables.isLoading} error={tables.isError} onRetry={() => void tables.refetch()}>
        {/* Top metrics summary */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <StatTile label="Total tables" value={String(items.length)} note="Active in venue" />
          </View>
          <View style={styles.statCol}>
            <StatTile label="QR codes" value={String(items.length)} note="Live routing to table" />
          </View>
          <View style={styles.statCol}>
            <StatTile
              label="Print status"
              value={items.length > 0 ? 'Ready' : 'No tables'}
              note="PDF & batch print"
            />
          </View>
        </View>

        {/* Top Action Buttons */}
        <View style={styles.topActionsRow}>
          <View style={styles.actionsLeft}>
            <Button
              label="Batch generate range"
              tone="primary"
              onPress={() => setRangeModalOpen(true)}
            />
            <Button
              label="Add custom tables"
              tone="secondary"
              onPress={() => setSingleAddModalOpen(true)}
            />
          </View>

          {items.length > 0 ? (
            <Button
              label="Print all table cards"
              tone="secondary"
              onPress={() => handlePrint()}
            />
          ) : null}
        </View>

        {/* Live Table Card Customizer & Interactive Mockup */}
        {open ? (
          <DeskCard style={[styles.customizerCard, { borderColor: accentColor }]}>
            <View style={styles.customizerHeader}>
              <View style={styles.customizerTitleRow}>
                <IconTile icon={QrCode} tone="tint" size={36} />
                <View>
                  <Text variant="title">
                    {open.label ?? `Table ${open.code}`} Live Card Preview
                  </Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    Customize format, colors and print vector artwork
                  </Text>
                </View>
              </View>

              <View style={styles.previewActionBtns}>
                <Button
                  label="Print this card"
                  tone="primary"
                  onPress={() => handlePrint(open)}
                />
              </View>
            </View>

            {/* Customizer Settings Controls */}
            <View style={[styles.controlsRow, { backgroundColor: theme.wash, borderColor: theme.line }]}>
              {/* Template Picker */}
              <View style={styles.controlGroup}>
                <Text variant="caption" style={styles.controlLabel}>
                  FORMAT TEMPLATE
                </Text>
                <View style={styles.templateChips}>
                  {[
                    { id: 'folded_tent' as const, label: 'Tent Card' },
                    { id: 'acrylic_stand' as const, label: 'Acrylic Stand' },
                    { id: 'sticker' as const, label: 'Sticker' },
                  ].map((tpl) => {
                    const active = template === tpl.id;
                    return (
                      <Pressable
                        key={tpl.id}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        onPress={() => setTemplate(tpl.id)}
                        style={[
                          styles.templateBtn,
                          {
                            borderColor: active ? theme.fill : theme.line,
                            backgroundColor: active ? theme.fill : theme.white,
                          },
                        ]}
                      >
                        <Text
                          variant="caption"
                          style={{
                            color: active ? theme.white : theme.text,
                            fontWeight: active ? '700' : '500',
                          }}
                        >
                          {tpl.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Accent Color Picker */}
              <View style={styles.controlGroup}>
                <Text variant="caption" style={styles.controlLabel}>
                  BRAND ACCENT COLOR
                </Text>
                <View style={styles.colorSwatches}>
                  {['#D24000', '#111111', '#047857', '#1D4ED8', '#6D28D9'].map((c) => {
                    const selected = accentColor === c;
                    return (
                      <Pressable
                        key={c}
                        accessibilityRole="button"
                        accessibilityLabel={`Color ${c}`}
                        onPress={() => setAccentColor(c)}
                        style={[
                          styles.swatchBtn,
                          {
                            backgroundColor: c,
                            borderColor: selected ? '#FFFFFF' : 'transparent',
                            transform: [{ scale: selected ? 1.15 : 1 }],
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Realistic Table Mockup Container */}
            <View style={styles.mockupContainer}>
              <View
                style={[
                  styles.cardMockup,
                  template === 'sticker' && styles.stickerMockup,
                  template === 'acrylic_stand' && styles.acrylicMockup,
                ]}
              >
                <View style={[styles.cardTopBar, { backgroundColor: accentColor }]} />
                <View style={styles.mockupInner}>
                  <Image
                    source={require('../../../../assets/images/icon.png')}
                    style={styles.logo}
                    accessibilityIgnoresInvertColors
                  />
                  <Text variant="caption" style={styles.poweredByText}>
                    POWERED BY OZAA
                  </Text>
                  <Text variant="title" style={styles.venueNameText}>
                    {venue.data?.name ?? 'Restaurant'}
                  </Text>

                  <View style={[styles.codeBadge, { backgroundColor: '#111111' }]}>
                    <Text variant="display-m" style={styles.codeBadgeText}>
                      {open.label ?? `Table ${open.code}`}
                    </Text>
                  </View>

                  {/* Sharp vector QR code */}
                  <View style={styles.qrFrame}>
                    <QrMark url={open.qrUrl ?? `https://ozaa.app/t/${venueId}/${open.code}`} />
                  </View>

                  <Text variant="caption" style={styles.mockupCta}>
                    {ctaMessage}
                  </Text>

                  <Text variant="caption" style={styles.mockupUrl}>
                    {open.qrUrl ?? `ozaa.app/t/${venueId}/${open.code}`}
                  </Text>
                </View>
              </View>
            </View>
          </DeskCard>
        ) : null}

        {/* Table List Header */}
        <SectionLabel
          title={`ALL TABLES (${items.length})`}
          caps
        />

        {items.length === 0 ? (
          <EmptyCard
            icon={QrCode}
            title="No tables set up yet"
            description="Generate table QR codes in seconds. Diners scan them to order food, call waiters, and pay with Mobile Money."
            actionLabel="Generate tables (1–10)"
            onAction={() => setRangeModalOpen(true)}
          />
        ) : (
          <View style={styles.tableGrid}>
            {items.map((table) => {
              const isSelected = table.id === open?.id;
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
                      borderColor: isSelected ? accentColor : theme.line,
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
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Print ${labelText}`}
                      onPress={() => handlePrint(table)}
                      style={[styles.smallIconBtn, { backgroundColor: theme.wash }]}
                    >
                      <Printer size={16} color={theme.text} />
                    </Pressable>
                  </View>

                  <View style={styles.tableCardBottom}>
                    <View style={styles.qrIndicator}>
                      <QrCode size={13} color={theme.fill} />
                      <Text variant="caption" style={{ color: theme.fill, fontWeight: '600' }}>
                        QR Active
                      </Text>
                    </View>
                    <Text variant="caption" style={{ color: theme.meta }}>
                      {isSelected ? 'Currently previewing' : 'Tap to preview'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Batch Range Modal */}
        <RangeModal
          visible={rangeModalOpen}
          onClose={() => setRangeModalOpen(false)}
          onGenerate={(codes) => addBatchMutation.mutate(codes)}
          loading={addBatchMutation.isPending}
        />

        {/* Single/List Add Modal */}
        <SingleAddModal
          visible={singleAddModalOpen}
          onClose={() => setSingleAddModalOpen(false)}
          onAdd={(codes) => addBatchMutation.mutate(codes)}
          loading={addBatchMutation.isPending}
        />
      </DeskWait>
    </OwnerPage>
  );
}

// ==========================================
// Batch Range Generator Modal
// ==========================================
function RangeModal({
  visible,
  onClose,
  onGenerate,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onGenerate: (codes: string[]) => void;
  loading: boolean;
}) {
  const theme = useTheme();
  const [startNum, setStartNum] = useState('1');
  const [endNum, setEndNum] = useState('15');
  const [prefix, setPrefix] = useState('');

  const s = parseInt(startNum, 10);
  const e = parseInt(endNum, 10);
  const count = !isNaN(s) && !isNaN(e) && e >= s ? e - s + 1 : 0;

  const handleGenerate = () => {
    if (count <= 0) return;
    const codes = generateTableCodes(
      s,
      e,
      prefix.trim() ? prefix.trim() + ' ' : ''
    );
    onGenerate(codes);
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Generate Table Range"
      subtitle="Instantly generate sequential QR codes for your dining floor, patio or bar."
    >
      <View style={modalStyles.stack}>
        <View style={modalStyles.row}>
          <Field
            label="Start Number"
            value={startNum}
            onChangeText={setStartNum}
            keyboardType="number-pad"
            placeholder="1"
            style={{ flex: 1 }}
          />
          <Field
            label="End Number"
            value={endNum}
            onChangeText={setEndNum}
            keyboardType="number-pad"
            placeholder="15"
            style={{ flex: 1 }}
          />
        </View>

        <Field
          label="Optional Prefix (e.g. Patio, Bar, Booth)"
          value={prefix}
          onChangeText={setPrefix}
          placeholder="e.g. Patio"
        />

        <View style={[modalStyles.summaryBox, { backgroundColor: theme.wash }]}>
          <Text variant="caption" style={{ color: theme.meta }}>
            This will create <Text variant="body-strong">{count}</Text> table QR codes (
            {prefix ? `${prefix} ${s}` : s} through {prefix ? `${prefix} ${e}` : e}).
          </Text>
        </View>

        <Button
          label={`Generate ${count} table codes`}
          tone="primary"
          onPress={handleGenerate}
          loading={loading}
          disabled={count <= 0 || loading}
        />
      </View>
    </ModalSheet>
  );
}

// ==========================================
// Single/List Add Modal
// ==========================================
function SingleAddModal({
  visible,
  onClose,
  onAdd,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (codes: string[]) => void;
  loading: boolean;
}) {
  const [input, setInput] = useState('');

  const parsed = input
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Add Custom Table Codes"
      subtitle="Enter individual table numbers or names separated by commas."
    >
      <View style={modalStyles.stack}>
        <Field
          label="Table Codes (comma separated)"
          value={input}
          onChangeText={setInput}
          placeholder="e.g. VIP 1, Bar 4, Garden Terrace"
          multiline
          numberOfLines={3}
        />

        <Button
          label={`Add ${parsed.length} table${parsed.length === 1 ? '' : 's'}`}
          tone="primary"
          onPress={() => onAdd(parsed)}
          loading={loading}
          disabled={parsed.length === 0 || loading}
        />
      </View>
    </ModalSheet>
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
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.space[2],
    marginVertical: tokens.space[1],
  },
  actionsLeft: {
    flexDirection: 'row',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  customizerCard: {
    gap: tokens.space[3],
    borderWidth: 2,
    marginTop: tokens.space[2],
  },
  customizerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  customizerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  previewActionBtns: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: tokens.space[4],
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlGroup: {
    gap: tokens.space[1],
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#71717A',
  },
  templateChips: {
    flexDirection: 'row',
    gap: tokens.space[1],
  },
  templateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  colorSwatches: {
    flexDirection: 'row',
    gap: tokens.space[2],
    alignItems: 'center',
  },
  swatchBtn: {
    width: 24,
    height: 24,
    borderRadius: tokens.radius.full,
    borderWidth: 2,
  },
  mockupContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.space[4],
  },
  cardMockup: {
    backgroundColor: '#FFFFFF',
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    overflow: 'hidden',
  },
  stickerMockup: {
    borderRadius: 160,
    maxWidth: 280,
  },
  acrylicMockup: {
    borderRadius: tokens.radius.sm,
    borderWidth: 2,
    maxWidth: 340,
  },
  cardTopBar: {
    height: 6,
    width: '100%',
  },
  mockupInner: {
    alignItems: 'center',
    padding: tokens.space[5],
    gap: tokens.space[2],
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  poweredByText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#888888',
  },
  venueNameText: {
    fontSize: 20,
    fontWeight: '700',
  },
  codeBadge: {
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[1],
    borderRadius: tokens.radius.full,
    marginVertical: 4,
  },
  codeBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
  qrFrame: {
    padding: tokens.space[2],
    backgroundColor: '#FFFFFF',
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  mockupCta: {
    textAlign: 'center',
    maxWidth: 240,
    color: '#444444',
    lineHeight: 18,
    fontWeight: '600',
  },
  mockupUrl: {
    color: '#999999',
    fontSize: 11,
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
  smallIconBtn: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
});

const modalStyles = StyleSheet.create({
  stack: {
    gap: tokens.space[4],
  },
  row: {
    flexDirection: 'row',
    gap: tokens.space[3],
  },
  summaryBox: {
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
  },
});

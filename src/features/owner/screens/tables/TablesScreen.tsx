import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Download, Printer, QrCode, Share2 } from 'lucide-react-native';
import { api } from '@/lib/api';
import { generateTableCardHtml, type TableCardTemplate } from '@/features/tables';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { EmptyCard, SectionLabel, toast } from '../../kit';
import { AddTablesSheet } from './AddTablesSheet';
import { CARD_ACCENTS, TableCardControls, TableCardPreview } from './TableCardPreview';
import { canPrint, downloadQr, printHtml, shareLink } from './qrActions';

export function TablesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const wide = width >= 1100;
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const [template, setTemplate] = useState<TableCardTemplate>('folded_tent');
  const [accent, setAccent] = useState<string>(CARD_ACCENTS[0].hex);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const tables = useQuery({
    queryKey: ownerKeys.tables(venueId),
    queryFn: () => api.ownerListTables(venueId),
    enabled: Boolean(venueId),
  });
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });

  const add = useMutation({
    mutationFn: (codes: string[]) => api.ownerCreateTables(venueId, { codes }),
    onSuccess: (_data, codes) => {
      setAdding(false);
      toast.success(t('ownerTables.added', { count: codes.length }));
      void client.invalidateQueries({ queryKey: ownerKeys.tables(venueId) });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  const items = tables.data?.items ?? [];
  const open = items.find((table) => table.id === openId) ?? items[0] ?? null;
  const venueName = venue.data?.name ?? '';
  const cta = t('ownerTables.cta');

  const print = (all: boolean) => {
    const targets = all ? items : open ? [open] : [];
    const ok = printHtml(
      generateTableCardHtml(targets, { template, accentColor: accent, ctaText: cta }, venueName),
    );
    if (!ok) toast.error(t('ownerTables.popupBlocked'));
  };
  const share = async () => {
    if (!open?.qrUrl) return;
    const result = await shareLink(open.qrUrl, `${venueName} · ${name(open)}`);
    if (result === 'copied') toast.success(t('ownerTables.copied'));
    if (result === 'failed') toast.error(t('ownerTables.shareFailed'));
  };

  const name = (table: (typeof items)[number]) =>
    table.label ?? t('ownerOrders.table', { code: table.code });

  const preview = open ? (
    <View style={[styles.card, { borderColor: theme.line, backgroundColor: theme.surface }]}>
      <TableCardPreview
        table={open}
        venueName={venueName}
        template={template}
        accent={accent}
        cta={cta}
      />
      <TableCardControls
        template={template}
        onTemplate={setTemplate}
        accent={accent}
        onAccent={setAccent}
      />
      <View style={styles.actions}>
        {canPrint ? (
          <Button
            label={t('ownerTables.printOne', { name: name(open) })}
            onPress={() => print(false)}
          />
        ) : null}
        <View style={styles.row}>
          <IconAction icon={Share2} label={t('ownerTables.share')} onPress={() => void share()} />
          {canPrint ? (
            <IconAction
              icon={Download}
              label={t('ownerTables.download')}
              onPress={() =>
                open.qrUrl &&
                downloadQr(open.qrUrl, `${venueName}-${open.code}`.replace(/\s+/g, '-'))
              }
            />
          ) : null}
          {canPrint && items.length > 1 ? (
            <IconAction
              icon={Printer}
              label={t('ownerTables.printAll', { count: items.length })}
              onPress={() => print(true)}
            />
          ) : null}
        </View>
        {canPrint ? null : (
          <Text variant="caption" style={{ color: theme.muted }}>
            {t('ownerTables.printOnWeb')}
          </Text>
        )}
      </View>
    </View>
  ) : null;

  const list = (
    <View style={styles.listWrap}>
      <SectionLabel title={t('ownerTables.count', { count: items.length })} caps />
      <View accessibilityRole="radiogroup" style={styles.grid}>
        {items.map((table) => {
          const on = table.id === open?.id;
          return (
            <Pressable
              key={table.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={name(table)}
              onPress={() => setOpenId(table.id)}
              style={({ pressed }) => [
                styles.seat,
                {
                  backgroundColor: on ? theme.black : pressed ? theme.wash : theme.surface,
                  borderColor: on ? theme.black : theme.line,
                },
              ]}
            >
              <Text variant="body-strong" style={{ color: on ? theme.white : theme.text }}>
                {table.code}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <OwnerPage
      title={t('owner.tables')}
      action={
        items.length > 0 ? (
          <Button
            label={t('ownerTables.addShort')}
            tone="secondary"
            size="md"
            onPress={() => setAdding(true)}
          />
        ) : null
      }
    >
      <DeskWait
        loading={tables.isLoading}
        error={tables.isError}
        onRetry={() => void tables.refetch()}
      >
        {items.length === 0 ? (
          <EmptyCard
            icon={QrCode}
            title={t('ownerTables.emptyTitle')}
            description={t('ownerTables.emptyBody')}
            actionLabel={t('ownerTables.addTitle')}
            onAction={() => setAdding(true)}
          />
        ) : wide ? (
          <View style={styles.split}>
            <View style={styles.flex}>{list}</View>
            <View style={styles.flex}>{preview}</View>
          </View>
        ) : (
          <>
            {list}
            {preview}
          </>
        )}
      </DeskWait>
      <AddTablesSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onAdd={(codes) => add.mutate(codes)}
        loading={add.isPending}
        existing={items.map((table) => table.code)}
      />
    </OwnerPage>
  );
}

function IconAction({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof Share2;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconAction,
        { borderColor: theme.line, backgroundColor: pressed ? theme.wash : theme.surface },
      ]}
    >
      <Icon size={18} color={theme.ink} />
      <Text variant="caption" numberOfLines={1} style={{ fontFamily: fontFamily.strong }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  split: { flexDirection: 'row', gap: tokens.space[6], alignItems: 'flex-start' },
  card: {
    gap: tokens.space[4],
    padding: tokens.space[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  actions: { gap: tokens.space[3] },
  row: { flexDirection: 'row', gap: tokens.space[2] },
  iconAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[1],
    minHeight: tokens.touchTarget + tokens.space[4],
    paddingHorizontal: tokens.space[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
  },
  listWrap: { gap: tokens.space[2] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  seat: {
    minWidth: 52,
    height: 52,
    paddingHorizontal: tokens.space[3],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
  },
});

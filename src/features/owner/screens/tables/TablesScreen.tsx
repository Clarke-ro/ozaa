import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { QrCode } from 'lucide-react-native';
import { api } from '@/lib/api';
import { canPayOnline } from '@/lib/payments';
import { generateTableCardHtml, type TableCardTemplate } from '@/features/tables';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { EmptyCard, toast } from '../../kit';
import { Text } from '@/ui/Text';
import { useOwnerLayout } from '../../chrome/layout';
import { AddTablesSheet } from './AddTablesSheet';
import { EmbedCard } from './EmbedCard';
import { MenuLinkCard } from './MenuLinkCard';
import { printHtml, shareLink } from './qrActions';
import { TableQrCard } from './TableQrCard';
import { CARD_ACCENTS } from './TableCardPreview';

/**
 * QR codes and links in one column: the menu's own QR code and link first (for posters and
 * bios), the website embed folded under it, then one card for the table QR codes, where you
 * pick a table, style its card and print it.
 */
export function TablesScreen() {
  const { desktop } = useOwnerLayout();
  const { t } = useTranslation();
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
  // Printed cards only promise paying by phone where the venue takes payment online.
  const cta = t(canPayOnline(venue.data) ? 'ownerTables.cta' : 'ownerTables.ctaNoPay');
  const name = (table: (typeof items)[number]) =>
    table.label ?? t('ownerOrders.table', { code: table.code });

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

  return (
    <OwnerPage
      width="mid"
      title={t('owner.tables')}
      subtitle={t('ownerTables.pageLead')}
      action={
        items.length > 0 ? (
          <Button label={t('ownerTables.addShort')} onPress={() => setAdding(true)} />
        ) : null
      }
    >
      <View style={styles.stack}>
        {venue.data ? (
          <View style={styles.group}>
            <Text variant="title" accessibilityRole="header">
              {t('ownerTables.yourMenuLink')}
            </Text>
            <MenuLinkCard slug={venue.data.slug} venueName={venueName} />
            <EmbedCard slug={venue.data.slug} venueName={venueName} />
          </View>
        ) : null}

        <View style={styles.group}>
          <Text variant="title" accessibilityRole="header">
            {t('ownerTables.tableCodesTitle')}
          </Text>
          <DeskWait
            loading={tables.isLoading}
            error={tables.isError}
            onRetry={() => void tables.refetch()}
          >
            {items.length === 0 || !open ? (
              <EmptyCard
                icon={QrCode}
                title={t('ownerTables.emptyTitle')}
                description={t('ownerTables.emptyBody')}
                actionLabel={t('ownerTables.addTitle')}
                onAction={() => setAdding(true)}
              />
            ) : (
              <TableQrCard
                tables={items}
                open={open}
                onOpen={setOpenId}
                name={name}
                venueName={venueName}
                template={template}
                onTemplate={setTemplate}
                accent={accent}
                onAccent={setAccent}
                cta={cta}
                onPrint={print}
                onShare={() => void share()}
                side={desktop}
              />
            )}
          </DeskWait>
        </View>
      </View>
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

const styles = StyleSheet.create({
  // Canvas: 56 px between the menu link and the table codes, 20 px under each heading.
  stack: { gap: tokens.owner.controls.todayGap },
  group: { gap: tokens.owner.controls.headGap },
});

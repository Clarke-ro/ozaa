import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { QrCode } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { Table } from '@/lib/api/types';
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
import { AllTables } from './AllTables';
import { downloadQr, printHtml } from './qrActions';
import { TableCard } from './TableCard';
import { TableQrCard } from './TableQrCard';
import { CARD_ACCENTS } from './TableCardPreview';

// The canvas draws the All tables cards at 62% of the big preview.
const CARD_IN_GRID = 0.62;

/**
 * QR codes and links (canvas): the menu's own QR code and link, the website embed, the table
 * card style and colour with a preview, then every table's card with its own Print and Download.
 */
export function TablesScreen() {
  const { desktop } = useOwnerLayout();
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const [template, setTemplate] = useState<TableCardTemplate>('folded_tent');
  const [accent, setAccent] = useState<string>(CARD_ACCENTS[0].hex);
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
  const first = items[0] ?? null;
  const venueName = venue.data?.name ?? '';
  const venueAccent = venue.data?.theme.accent ?? CARD_ACCENTS[0].hex;
  const logoUrl = venue.data?.logo?.url ?? null;
  // Printed cards only promise paying by phone where the venue takes payment online.
  const cta = t(canPayOnline(venue.data) ? 'ownerTables.cta' : 'ownerTables.ctaNoPay');
  const shortText = t('ownerTables.scanToOrder');
  const name = (table: Table) => table.label ?? t('ownerOrders.table', { code: table.code });

  const print = (targets: Table[], pdf = false) => {
    const ok = printHtml(
      generateTableCardHtml(
        targets,
        { template, accentColor: accent, ctaText: cta, shortText, logoUrl },
        venueName,
      ),
    );
    if (!ok) toast.error(t('ownerTables.popupBlocked'));
    // Browsers save a PDF from the print window, so "Download as PDF" says where to click.
    else if (pdf) toast.success(t('ownerTables.pdfHint'));
  };
  const card = (table: Table, scale?: number) => (
    <TableCard
      template={template}
      scale={scale}
      accent={accent}
      venueName={venueName}
      label={name(table)}
      qrUrl={table.qrUrl ?? ''}
      cta={cta}
      shortText={shortText}
      logoUrl={logoUrl}
    />
  );

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
            {items.length === 0 || !first ? (
              <EmptyCard
                icon={QrCode}
                title={t('ownerTables.emptyTitle')}
                description={t('ownerTables.emptyBody')}
                actionLabel={t('ownerTables.addTitle')}
                onAction={() => setAdding(true)}
              />
            ) : (
              <View style={styles.stack}>
                <TableQrCard
                  count={items.length}
                  preview={card(first)}
                  template={template}
                  onTemplate={setTemplate}
                  accent={accent}
                  onAccent={setAccent}
                  venueAccent={venueAccent}
                  onPrintAll={() => print(items)}
                  onPdfAll={() => print(items, true)}
                  side={desktop}
                />
                <AllTables
                  tables={items}
                  styleLabel={t(`ownerTables.styles.${template}`)}
                  name={name}
                  renderCard={(table) => card(table, CARD_IN_GRID)}
                  onPrint={(table) => print([table])}
                  onDownload={(table) =>
                    table.qrUrl &&
                    downloadQr(table.qrUrl, `${venueName}-${table.code}`.replace(/\s+/g, '-'))
                  }
                />
              </View>
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

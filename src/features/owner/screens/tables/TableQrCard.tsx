import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Download, Printer, Share2 } from 'lucide-react-native';
import type { Table } from '@/lib/api/types';
import type { TableCardTemplate } from '@/features/tables';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { IconAction } from './IconAction';
import { canPrint, downloadQr } from './qrActions';
import { TableCardControls, TableCardPreview } from './TableCardPreview';

/**
 * The table QR codes (design canvas): on the left the table numbers to pick from, the card's
 * style and colour, Print all and the one-table actions; on the right, on a grey panel, the
 * printed card for the picked table. Phones stack the two.
 */
export function TableQrCard({
  tables,
  open,
  onOpen,
  name,
  venueName,
  template,
  onTemplate,
  accent,
  onAccent,
  cta,
  onPrint,
  onShare,
  side,
}: {
  tables: Table[];
  open: Table;
  onOpen: (id: string) => void;
  name: (table: Table) => string;
  venueName: string;
  template: TableCardTemplate;
  onTemplate: (next: TableCardTemplate) => void;
  accent: string;
  onAccent: (next: string) => void;
  cta: string;
  onPrint: (all: boolean) => void;
  onShare: () => void;
  /** Room for the preview beside the controls. */
  side: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  const preview = (
    <View style={[styles.preview, side && styles.previewSide, { backgroundColor: theme.wash }]}>
      <TableCardPreview
        table={open}
        venueName={venueName}
        template={template}
        accent={accent}
        cta={cta}
      />
    </View>
  );

  return (
    <View style={[styles.wrap, side && styles.row]}>
      <View style={[styles.controls, side && styles.controlsSide]}>
        <View style={styles.block}>
          <Text style={styles.label}>{t('ownerTables.count', { count: tables.length })}</Text>
          <View accessibilityRole="radiogroup" style={styles.seats}>
            {tables.map((table) => {
              const on = table.id === open.id;
              return (
                <Pressable
                  key={table.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={name(table)}
                  onPress={() => onOpen(table.id)}
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
        {side ? null : preview}
        <TableCardControls
          template={template}
          onTemplate={onTemplate}
          accent={accent}
          onAccent={onAccent}
        />
        <View style={styles.block}>
          {canPrint && tables.length > 1 ? (
            <Button
              label={t('ownerTables.printAll', { count: tables.length })}
              tone="secondary"
              onPress={() => onPrint(true)}
              style={[styles.printAll, { backgroundColor: theme.black, borderColor: theme.black }]}
              labelColor={theme.white}
            />
          ) : null}
          <View style={styles.actions}>
            {canPrint ? (
              <IconAction
                icon={Printer}
                label={t('ownerTables.printOne', { name: name(open) })}
                onPress={() => onPrint(false)}
              />
            ) : null}
            <IconAction icon={Share2} label={t('ownerTables.share')} onPress={onShare} />
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
          </View>
          {canPrint ? null : (
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('ownerTables.printOnWeb')}
            </Text>
          )}
        </View>
      </View>
      {side ? preview : null}
    </View>
  );
}

const SEAT = tokens.touchTarget + tokens.space[1];

const styles = StyleSheet.create({
  // Canvas: controls up to 600 px wide, 40 px gap, a 360 px grey preview panel.
  wrap: { gap: tokens.space[6] },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[10] },
  controls: { gap: tokens.space[6] },
  controlsSide: { flex: 1, maxWidth: 600, minWidth: 0 },
  block: { gap: tokens.space[3] },
  label: { fontSize: 16, lineHeight: 22, fontFamily: 'Inter_600' },
  printAll: { minHeight: 52 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  seats: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  seat: {
    minWidth: SEAT,
    height: SEAT,
    paddingHorizontal: tokens.space[3],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.full,
  },
  preview: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.space[8],
    paddingHorizontal: tokens.space[4],
    borderRadius: 20,
  },
  previewSide: { width: 360, minHeight: 440 },
});

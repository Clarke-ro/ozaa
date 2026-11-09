import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Download, Printer, Share2 } from 'lucide-react-native';
import type { Table } from '@/lib/api/types';
import type { TableCardTemplate } from '@/features/tables';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';
import { IconAction } from './IconAction';
import { canPrint, downloadQr } from './qrActions';
import { TableCardControls, TableCardPreview } from './TableCardPreview';

/**
 * The table QR codes in one white card: a row of table numbers to pick from, the printed card
 * for the picked table with its style controls, then Print (the page's one filled button) and
 * Share, Download and Print all.
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
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.card, cardStyle(theme)]}>
      <View style={styles.block}>
        <Text variant="caption" style={{ color: theme.muted }}>
          {t('ownerTables.count', { count: tables.length })}
        </Text>
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
                    backgroundColor: on ? theme.black : pressed ? theme.line : theme.wash,
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

      <View style={[styles.preview, { backgroundColor: theme.wash }]}>
        <TableCardPreview
          table={open}
          venueName={venueName}
          template={template}
          accent={accent}
          cta={cta}
        />
      </View>
      <TableCardControls
        template={template}
        onTemplate={onTemplate}
        accent={accent}
        onAccent={onAccent}
      />

      <View style={styles.block}>
        {canPrint ? (
          <Button
            label={t('ownerTables.printOne', { name: name(open) })}
            onPress={() => onPrint(false)}
          />
        ) : null}
        <View style={styles.row}>
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
          {canPrint && tables.length > 1 ? (
            <IconAction
              icon={Printer}
              label={t('ownerTables.printAll', { count: tables.length })}
              onPress={() => onPrint(true)}
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
  );
}

const SEAT = tokens.touchTarget + tokens.space[1];

const styles = StyleSheet.create({
  card: { padding: tokens.space[4], gap: tokens.space[5] },
  block: { gap: tokens.space[3] },
  seats: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  seat: {
    minWidth: SEAT,
    height: SEAT,
    paddingHorizontal: tokens.space[3],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm,
    borderCurve: 'continuous',
  },
  preview: {
    alignItems: 'center',
    paddingVertical: tokens.space[6],
    borderRadius: tokens.radius.md,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
});

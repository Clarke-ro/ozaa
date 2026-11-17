import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TableCardTemplate } from '@/features/tables';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';
import { useTheme } from '@/ui/theme';
import { canPrint } from './qrActions';
import { TableCardControls } from './TableCardPreview';

/**
 * Table QR codes (canvas): style and colour on the left, then Print all and Download all; on
 * the right, on a grey panel, the card for the first table in the chosen style. Phones stack them.
 */
export function TableQrCard({
  count,
  preview,
  template,
  onTemplate,
  accent,
  onAccent,
  venueAccent,
  onPrintAll,
  onPdfAll,
  tap,
  onTap,
  side,
}: {
  count: number;
  preview: React.ReactNode;
  template: TableCardTemplate;
  onTemplate: (next: TableCardTemplate) => void;
  accent: string;
  onAccent: (next: string) => void;
  venueAccent: string;
  onPrintAll: () => void;
  onPdfAll: () => void;
  tap: boolean;
  onTap: (next: boolean) => void;
  side: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const panel = (
    <View
      accessible
      accessibilityLabel={t('ownerTables.previewLabel')}
      style={[styles.panel, side && styles.panelSide, { backgroundColor: theme.line }]}
    >
      {preview}
    </View>
  );
  return (
    <View style={[styles.wrap, side && styles.row]}>
      <View style={[styles.controls, side && styles.controlsSide]}>
        <TableCardControls
          template={template}
          onTemplate={onTemplate}
          accent={accent}
          onAccent={onAccent}
          venueAccent={venueAccent}
        />
        <View style={styles.tapRow}>
          <View style={styles.tapCopy}>
            <Text variant="body-strong">{t('ownerTables.tapCards')}</Text>
            <Text variant="caption" style={{ color: theme.meta }}>
              {t('ownerTables.tapCardsHint')}
            </Text>
          </View>
          <Toggle value={tap} onChange={onTap} label={t('ownerTables.tapCards')} />
        </View>
        {side ? null : panel}
        {canPrint ? (
          <View style={styles.buttons}>
            <Button
              label={t('ownerTables.printAll', { count })}
              tone="secondary"
              onPress={onPrintAll}
              style={[styles.big, { backgroundColor: theme.black, borderColor: theme.black }]}
              labelColor={theme.white}
            />
            <Button label={t('ownerTables.pdfAll')} tone="secondary" onPress={onPdfAll} />
          </View>
        ) : (
          <Text variant="caption" style={{ color: theme.muted }}>
            {t('ownerTables.printOnWeb')}
          </Text>
        )}
      </View>
      {side ? panel : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Canvas: controls up to 600 px wide, 40 px gap, a 360 px grey preview panel.
  wrap: { gap: tokens.space[6] },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[10] },
  controls: { gap: tokens.space[6] },
  controlsSide: { flex: 1, maxWidth: 600, minWidth: 0 },
  buttons: { gap: 10, marginTop: tokens.space[2] },
  tapRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  tapCopy: { flex: 1, gap: 2 },
  big: { minHeight: 52 },
  panel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.space[8],
    paddingHorizontal: tokens.space[4],
    borderRadius: 20,
  },
  panelSide: { width: 360, minHeight: 440 },
});

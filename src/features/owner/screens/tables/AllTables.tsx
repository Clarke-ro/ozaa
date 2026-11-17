import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Download, Nfc, Printer } from 'lucide-react-native';
import type { Table } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { SectionHead } from '../dashboard/SectionHead';
import { IconAction } from './IconAction';
import { canPrint } from './qrActions';

// Canvas grid: columns at least 176 px wide, 16 px apart.
const MIN = 176;
const GAP = 16;

/** Every table's card in the chosen style, each with its own Print, Download and NFC tag. */
export function AllTables({
  tables,
  styleLabel,
  name,
  renderCard,
  onPrint,
  onDownload,
  onNfc,
}: {
  tables: Table[];
  styleLabel: string;
  name: (table: Table) => string;
  renderCard: (table: Table) => React.ReactNode;
  onPrint: (table: Table) => void;
  onDownload: (table: Table) => void;
  onNfc: (table: Table) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const columns = Math.max(1, Math.floor((width + GAP) / (MIN + GAP)));
  const cell = width ? (width - GAP * (columns - 1)) / columns : MIN;
  return (
    <View style={styles.stack}>
      <SectionHead
        title={t('ownerTables.allTables')}
        badge={String(tables.length)}
        badgeTone="neutral"
        meta={`· ${styleLabel}`}
      />
      <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {tables.map((table) => (
          <View key={table.id} style={[styles.item, { width: cell }]}>
            <View style={[styles.tile, { backgroundColor: theme.line }]}>{renderCard(table)}</View>
            <View style={styles.foot}>
              <Text style={styles.name} numberOfLines={1}>
                {name(table)}
              </Text>
              {canPrint ? (
                <>
                  <IconAction
                    icon={Printer}
                    label={t('ownerTables.printOne', { name: name(table) })}
                    onPress={() => onPrint(table)}
                    compact
                  />
                  <IconAction
                    icon={Download}
                    label={t('ownerTables.downloadOne', { name: name(table) })}
                    onPress={() => onDownload(table)}
                    compact
                  />
                </>
              ) : null}
              <IconAction
                icon={Nfc}
                label={t('ownerTables.nfcOne', { name: name(table) })}
                onPress={() => onNfc(table)}
                compact
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.owner.controls.headGap },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  item: { gap: tokens.space[2] },
  tile: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, fontSize: 15, fontFamily: fontFamily.strong },
});

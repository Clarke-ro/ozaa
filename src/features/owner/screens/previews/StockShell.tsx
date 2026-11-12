import { makeStyles } from '@/ui/makeStyles';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Store } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { StatusPill } from '../../kit';
import { ShellScreen } from '../ShellScreen';

export function StockShell() {
  const styles = useStyles();
  const { t } = useTranslation();
  const theme = useTheme();

  const inventory = [
    {
      name: t('ownerShell.stock.rice'),
      quantity: '18.5 kg',
      status: t('ownerShell.stock.inStock'),
      tone: 'success' as const,
    },
    {
      name: t('ownerShell.stock.tilapia'),
      quantity: '4 pcs',
      status: t('ownerShell.stock.lowStock'),
      tone: 'waiting' as const,
    },
    {
      name: t('ownerShell.stock.plantain'),
      quantity: '0 pcs',
      status: t('ownerShell.stock.soldOut'),
      tone: 'error' as const,
    },
    {
      name: t('ownerShell.stock.sobolo'),
      quantity: '12 L',
      status: t('ownerShell.stock.inStock'),
      tone: 'success' as const,
    },
  ];

  const preview = (
    <View style={styles.protoContainer}>
      <View style={styles.stockList}>
        {inventory.map((item) => (
          <View key={item.name} style={styles.stockItemRow}>
            <View style={styles.stockItemInfo}>
              <Text variant="body-strong">{item.name}</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                {t('ownerShell.stock.remaining', { qty: item.quantity })}
              </Text>
            </View>
            <StatusPill tone={item.tone} label={item.status} boxed />
          </View>
        ))}
      </View>

      <View style={styles.auto86Note}>
        <AlertTriangle size={16} color={theme.warning} />
        <Text variant="caption" style={{ color: theme.warning, flex: 1 }}>
          {t('ownerShell.stock.auto86')}
        </Text>
      </View>
    </View>
  );

  return (
    <ShellScreen
      title={t('owner.stock')}
      next={[t('owner.stockNext1'), t('owner.stockNext2'), t('owner.stockNext3')]}
      icon={Store}
      badge={t('ownerShell.phase3')}
      preview={preview}
    />
  );
}

const useStyles = makeStyles((theme) => ({
  protoContainer: {
    gap: tokens.space[3],
  },
  stockList: {
    gap: tokens.space[2],
  },
  stockItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: tokens.space[1],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.wash,
  },
  stockItemInfo: {
    flex: 1,
    gap: 2,
  },
  auto86Note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: tokens.space[2],
    backgroundColor: theme.warningTint,
    borderRadius: tokens.radius.sm,
  },
}));

import { makeStyles } from '@/ui/makeStyles';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Receipt, Smartphone, Wallet } from 'lucide-react-native';
import { pesewas } from '@/lib/brand';
import { DEFAULT_CURRENCY, formatMoney, sumPesewas } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ShellScreen } from '../more/ShellScreen';

export function PosShell() {
  const styles = useStyles();
  const { t } = useTranslation();
  const theme = useTheme();
  const [selectedItems, setSelectedItems] = useState<string[]>(['jollof']);
  const [tenderMethod, setTenderMethod] = useState<'cash' | 'momo'>('cash');
  const [paid, setPaid] = useState(false);

  const menu = [
    { id: 'jollof', name: t('ownerShell.pos.jollof'), price: pesewas(6500) },
    { id: 'banku', name: t('ownerShell.pos.banku'), price: pesewas(7500) },
    { id: 'sobolo', name: t('ownerShell.pos.sobolo'), price: pesewas(1500) },
    { id: 'kelewele', name: t('ownerShell.pos.kelewele'), price: pesewas(2000) },
  ];

  const total = sumPesewas(
    selectedItems.flatMap((id) => menu.find((m) => m.id === id)?.price ?? []),
  );

  const toggleItem = (id: string) => {
    setPaid(false);
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const preview = (
    <View style={styles.protoContainer}>
      <View style={styles.dishGrid}>
        {menu.map((dish) => {
          const isSelected = selectedItems.includes(dish.id);
          return (
            <Pressable
              key={dish.id}
              accessibilityRole="button"
              accessibilityLabel={dish.name}
              onPress={() => toggleItem(dish.id)}
              style={[
                styles.dishTile,
                {
                  borderColor: isSelected ? theme.fill : theme.line,
                  backgroundColor: isSelected ? theme.tint : theme.surface,
                },
              ]}
            >
              <Text variant="body-strong">{dish.name}</Text>
              <Text
                variant="caption"
                style={{ color: isSelected ? theme.ink : theme.meta, fontWeight: '700' }}
              >
                {formatMoney(dish.price, DEFAULT_CURRENCY)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.ticketSummaryBox}>
        <View style={styles.ticketRow}>
          <Text variant="body-strong">{t('ownerShell.pos.billTotal')}</Text>
          <Text variant="display-m" style={styles.ticketTotalText}>
            {formatMoney(total, DEFAULT_CURRENCY)}
          </Text>
        </View>

        {paid ? (
          <View style={styles.paidBadge}>
            <CheckCircle2 size={16} color={theme.success} />
            <Text variant="caption" style={{ color: theme.success, fontWeight: '700' }}>
              {tenderMethod === 'cash'
                ? t('ownerShell.pos.paidCash')
                : t('ownerShell.pos.paidMomo')}
            </Text>
          </View>
        ) : (
          <View style={styles.tenderActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('ownerShell.pos.takeCash')}
              onPress={() => {
                setTenderMethod('cash');
                setPaid(true);
              }}
              style={[styles.tenderBtn, { backgroundColor: theme.black }]}
            >
              <Wallet size={16} color={theme.white} />
              <Text variant="caption" style={{ color: theme.white, fontWeight: '700' }}>
                {t('ownerShell.pos.takeCash')}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('ownerShell.pos.promptMomo')}
              onPress={() => {
                setTenderMethod('momo');
                setPaid(true);
              }}
              style={[styles.tenderBtn, { backgroundColor: theme.fill }]}
            >
              <Smartphone size={16} color={theme.onFill} />
              <Text variant="caption" style={{ color: theme.onFill, fontWeight: '700' }}>
                {t('ownerShell.pos.promptMomo')}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <ShellScreen
      title={t('owner.pos')}
      next={[t('owner.posNext1'), t('owner.posNext2'), t('owner.posNext3')]}
      icon={Receipt}
      badge={t('ownerShell.phase3')}
      preview={preview}
    />
  );
}

const useStyles = makeStyles((theme) => ({
  protoContainer: {
    gap: tokens.space[3],
  },
  dishGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  dishTile: {
    flex: 1,
    minWidth: 140,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    gap: 4,
  },
  ticketSummaryBox: {
    backgroundColor: theme.wash,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    gap: tokens.space[2],
    borderWidth: 1,
    borderColor: theme.line,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketTotalText: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.ink,
  },
  tenderActions: {
    flexDirection: 'row',
    gap: tokens.space[2],
    marginTop: tokens.space[1],
  },
  tenderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: tokens.radius.md,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: tokens.space[2],
    backgroundColor: theme.successTint,
    borderRadius: tokens.radius.sm,
  },
}));

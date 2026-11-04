import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MenuItem } from '@/lib/api/types';
import { pickOption } from '@/lib/dishLogic';
import { pesewas } from '@/lib/brand';
import { unitPrice } from '@/lib/dishRules';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Stepper } from '../../kit';
import type { DraftLine } from '../../desk/manualOrder';

/**
 * One dish in Create order: its price and a stepper. Once added, its add-on groups appear so
 * staff can pick the options the guest asked for. A missing required choice is flagged.
 */
export function PickDishRow({
  item,
  line,
  currency,
  missing,
  onChange,
}: {
  item: MenuItem;
  line: DraftLine | undefined;
  currency: string;
  /** The name of a required group still to pick, when the order was refused for it. */
  missing: string | null;
  onChange: (next: DraftLine) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const quantity = line?.quantity ?? 0;
  const picks = line?.picks ?? {};
  const set = (changes: Partial<DraftLine>) =>
    onChange({ key: item.id, item, quantity, picks, ...changes });
  return (
    <View style={[styles.row, { borderTopColor: theme.line }]}>
      <View style={styles.head}>
        <View style={styles.copy}>
          <Text variant="body-strong" numberOfLines={1}>
            {item.name.en}
          </Text>
          <Text variant="caption" style={{ color: theme.muted }}>
            {formatMoney(pesewas(unitPrice(item)), currency)}
          </Text>
        </View>
        <Stepper
          label={t('ownerOrders.create.howMany', { name: item.name.en })}
          value={quantity}
          min={0}
          max={50}
          onChange={(next) => set({ quantity: next })}
        />
      </View>
      {quantity > 0
        ? item.modifierGroups.map((group) => (
            <View key={group.id} style={styles.group}>
              <Text
                variant="caption"
                style={{ color: missing === group.name.en ? theme.error : theme.muted }}
              >
                {group.name.en}
                {group.min > 0 ? ` · ${t('ownerOrders.create.required')}` : ''}
              </Text>
              <View style={styles.options}>
                {group.options.map((option) => {
                  const on = (picks[group.id] ?? []).includes(option.id);
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole={group.max === 1 ? 'radio' : 'checkbox'}
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={option.name.en}
                      onPress={() =>
                        set({
                          picks: {
                            ...picks,
                            [group.id]: pickOption(group, picks[group.id] ?? [], option.id),
                          },
                        })
                      }
                      style={[
                        styles.chip,
                        {
                          borderColor: on ? theme.ink : theme.line,
                          backgroundColor: on ? theme.tint : theme.surface,
                        },
                      ]}
                    >
                      <Text variant="caption" style={{ color: on ? theme.ink : theme.text }}>
                        {option.name.en}
                        {option.pricePesewas
                          ? ` +${formatMoney(pesewas(option.pricePesewas), currency)}`
                          : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: tokens.space[2],
    paddingVertical: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  copy: { flex: 1, gap: 2 },
  group: { gap: tokens.space[1] },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
});

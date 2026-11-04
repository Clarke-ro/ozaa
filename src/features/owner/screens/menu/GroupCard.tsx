import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, X } from 'lucide-react-native';
import type { ModifierGroup } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { parseMoneyInput } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Segmented } from '../../kit';
import { newId } from './addOnPresets';

type Option = ModifierGroup['options'][number];

type Rule = 'one' | 'optional' | 'any';
const ruleOf = (g: ModifierGroup): Rule =>
  g.min === 1 && g.max === 1 ? 'one' : g.max === 1 ? 'optional' : 'any';

/** One add-on group: its name, the pick rule, and its options with prices. */
export function GroupCard({
  group,
  onChange,
  onRemove,
}: {
  group: ModifierGroup;
  onChange: (g: ModifierGroup) => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const setOption = (index: number, option: Option) =>
    onChange({ ...group, options: group.options.map((o, i) => (i === index ? option : o)) });
  const setRule = (rule: Rule) =>
    onChange({
      ...group,
      min: rule === 'one' ? 1 : 0,
      max: rule === 'any' ? Math.max(2, group.options.length) : 1,
    });
  return (
    <View style={[styles.card, { borderColor: theme.line, backgroundColor: theme.surface }]}>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={t('ownerMenu.groupName')}
          value={group.name.en}
          onChangeText={(text) => onChange({ ...group, name: { ...group.name, en: text } })}
          placeholder={t('ownerMenu.groupNameHint')}
          placeholderTextColor={theme.meta}
          style={[styles.name, { color: theme.text, borderBottomColor: theme.line }]}
        />
        <IconBtn label={t('ownerMenu.removeGroup', { name: group.name.en })} onPress={onRemove}>
          <Trash2 size={18} color={theme.error} />
        </IconBtn>
      </View>
      <Segmented
        label={t('ownerMenu.rule')}
        value={ruleOf(group)}
        onChange={setRule}
        options={[
          { id: 'one', label: t('ownerMenu.ruleOne') },
          { id: 'optional', label: t('ownerMenu.ruleOptional') },
          { id: 'any', label: t('ownerMenu.ruleAny') },
        ]}
      />
      {ruleOf(group) === 'one' ? (
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('ownerMenu.ruleOneHint')}
        </Text>
      ) : null}
      {group.options.map((option, index) => (
        <View key={option.id} style={styles.row}>
          <TextInput
            accessibilityLabel={t('ownerMenu.optionName')}
            value={option.name.en}
            onChangeText={(text) =>
              setOption(index, { ...option, name: { ...option.name, en: text } })
            }
            placeholder={t('ownerMenu.optionNameHint')}
            placeholderTextColor={theme.meta}
            style={[styles.input, styles.flex, { color: theme.text, borderColor: theme.line }]}
          />
          <MoneyInput
            value={option.pricePesewas}
            onChange={(p) => setOption(index, { ...option, pricePesewas: p })}
            label={t('ownerMenu.optionPrice')}
          />
          <IconBtn
            label={t('ownerMenu.removeOption', { name: option.name.en })}
            onPress={() =>
              onChange({ ...group, options: group.options.filter((_, i) => i !== index) })
            }
          >
            <X size={18} color={theme.muted} />
          </IconBtn>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          onChange({
            ...group,
            options: [
              ...group.options,
              { id: newId('opt'), name: { en: '' }, pricePesewas: pesewas(0) },
            ],
          })
        }
        style={styles.addOption}
      >
        <Plus size={16} color={theme.ink} />
        <Text variant="body-strong" style={{ color: theme.ink }}>
          {t('ownerMenu.addOption')}
        </Text>
      </Pressable>
    </View>
  );
}

/** Keeps the owner's own text while typing ("1." stays "1."), and only reports a parsed amount. */
function MoneyInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (p: ReturnType<typeof pesewas>) => void;
  label: string;
}) {
  const theme = useTheme();
  const [text, setText] = useState(value ? (value / 100).toFixed(2) : '');
  return (
    <TextInput
      accessibilityLabel={label}
      value={text}
      onChangeText={(next) => {
        setText(next);
        onChange(next.trim() ? (parseMoneyInput(next) ?? pesewas(value)) : pesewas(0));
      }}
      placeholder="+0.00"
      placeholderTextColor={theme.meta}
      keyboardType="decimal-pad"
      style={[styles.input, styles.price, { color: theme.text, borderColor: theme.line }]}
    />
  );
}

function IconBtn({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.icon}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.space[3],
    padding: tokens.space[3],
    boxShadow: tokens.shadow.card,
    borderRadius: tokens.radius.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  // minWidth 0 lets a web text box shrink below its natural width, so the row fits a phone.
  flex: { flex: 1, minWidth: 0 },
  name: {
    flex: 1,
    minHeight: 44,
    fontFamily: 'Inter_600',
    fontSize: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space[2],
    fontFamily: 'Inter_400',
    fontSize: 16,
  },
  price: { width: 88, textAlign: 'right' },
  icon: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[1],
    minHeight: tokens.touchTarget,
    alignSelf: 'flex-start',
  },
});

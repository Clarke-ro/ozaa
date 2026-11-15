import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import type { MenuItem } from '@/lib/api/types';
import { pickOption } from '@/lib/dishLogic';
import { hapticSelection } from '@/lib/haptics';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** The venue's add-on groups for one dish: one choice (radio) or several (tick boxes). */
export function DishChoices({
  groups,
  picks,
  onPick,
  missingId,
  money,
}: {
  groups: MenuItem['modifierGroups'];
  picks: Record<string, string[]>;
  onPick: (groupId: string, optionIds: string[]) => void;
  /** The required group the guest skipped, shown in red after they tap Add. */
  missingId: string | null;
  money: (pesewas: number) => string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <>
      {groups.map((group) => {
        const picked = picks[group.id] ?? [];
        const needed = missingId === group.id;
        return (
          <View key={group.id} style={styles.group}>
            <View style={styles.groupHead}>
              <Text variant="title" style={styles.flex}>
                {group.name.en}
              </Text>
              <Text
                variant="caption"
                style={{ color: needed ? theme.error : theme.muted, fontFamily: 'Inter_600' }}
              >
                {group.min > 0
                  ? t('menu.required')
                  : group.max > 1
                    ? t('menu.upTo', { count: group.max })
                    : t('menu.optional')}
              </Text>
            </View>
            {group.options.map((option) => {
              const on = picked.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole={group.max === 1 ? 'radio' : 'checkbox'}
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    void hapticSelection();
                    onPick(group.id, pickOption(group, picked, option.id));
                  }}
                  style={[
                    styles.option,
                    {
                      borderColor: on ? theme.fill : theme.line,
                      backgroundColor: on ? theme.tint : theme.white,
                    },
                  ]}
                >
                  <View
                    style={[
                      group.max === 1 ? styles.radio : styles.box,
                      {
                        borderColor: on ? theme.fill : theme.line,
                        backgroundColor: on ? theme.fill : 'transparent',
                      },
                    ]}
                  >
                    {on ? <Check size={14} color={theme.onFill} strokeWidth={3} /> : null}
                  </View>
                  <Text variant="body" style={styles.flex}>
                    {option.name.en}
                  </Text>
                  {option.pricePesewas ? (
                    <Text variant="caption" style={{ color: theme.muted }}>
                      +{money(option.pricePesewas)}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: 8 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

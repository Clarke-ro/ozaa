import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ModifierGroup } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { blankGroup, sizeGroup } from './addOnPresets';
import { GroupCard } from './GroupCard';

/**
 * Add-on groups such as "Spice level" (pick one, required) or "Extras" (pick any).
 * Choosing a rule sets min and max for the owner, so they never type numbers.
 * "Add sizes" starts a Small / Medium / Large group the guest must pick one of.
 */
export function AddOnsEditor({
  groups,
  onChange,
}: {
  groups: ModifierGroup[];
  onChange: (next: ModifierGroup[]) => void;
}) {
  const { t } = useTranslation();
  const update = (index: number, group: ModifierGroup) =>
    onChange(groups.map((g, i) => (i === index ? group : g)));
  return (
    <View style={styles.stack}>
      {groups.map((group, index) => (
        <GroupCard
          key={group.id}
          group={group}
          onChange={(g) => update(index, g)}
          onRemove={() => onChange(groups.filter((_, i) => i !== index))}
        />
      ))}
      <View style={styles.buttons}>
        <Button
          label={t('ownerMenu.addGroup')}
          tone="secondary"
          size="md"
          onPress={() => onChange([...groups, blankGroup()])}
        />
        <Button
          label={t('ownerMenu.addSizes')}
          tone="secondary"
          size="md"
          onPress={() =>
            onChange([
              ...groups,
              sizeGroup({
                name: t('ownerMenu.sizeName'),
                sizes: [
                  t('ownerMenu.sizeSmall'),
                  t('ownerMenu.sizeMedium'),
                  t('ownerMenu.sizeLarge'),
                ],
              }),
            ])
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[3] },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
});

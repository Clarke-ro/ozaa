import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Circle } from 'lucide-react-native';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useSetupChecklist } from '../../data/useSetupChecklist';
import { Band } from './Band';
import { cardStyle } from '../../kit/cardStyle';
import { SectionHead } from './SectionHead';

/**
 * "Complete your setup": how far along in a small orange badge, then one card row per step still
 * to do. A finished step drops off the list, and the whole section is gone once every step is
 * done. Each row opens the page where that step is done. Owners only.
 */
export function SetupList() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = useOwnerSession((state) => state.role);
  const list = useSetupChecklist(role === 'owner' ? venueId : '');
  if (!list || list.next === null) return null;
  const todo = list.steps.filter((step) => !step.done);

  return (
    <Band>
      <SectionHead
        title={t('ownerDash.setup.title')}
        badge={t('ownerDash.setup.badge', { percent: list.percent })}
      />
      <View style={styles.rows}>
        {todo.map((step) => {
          const label = t(`ownerDash.setup.steps.${step.id}`);
          return (
            <Pressable
              key={step.id}
              accessibilityRole="button"
              accessibilityLabel={`${label}, ${t('ownerDash.setup.todo')}`}
              onPress={() => router.push(step.href as Href)}
              style={({ pressed }) => [
                styles.row,
                cardStyle(theme),
                pressed && { backgroundColor: theme.wash },
              ]}
            >
              <Circle size={20} color={theme.meta} />
              <Text variant="body" numberOfLines={2} style={styles.label}>
                {label}
              </Text>
              <ChevronRight size={20} color={theme.meta} />
            </Pressable>
          );
        })}
      </View>
    </Band>
  );
}

const styles = StyleSheet.create({
  rows: { gap: tokens.space[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: tokens.touchTarget + tokens.space[1],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
  },
  label: { flex: 1 },
});

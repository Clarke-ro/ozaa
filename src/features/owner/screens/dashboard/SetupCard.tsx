import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Circle, CircleCheck } from 'lucide-react-native';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useSetupChecklist } from '../../data/useSetupChecklist';
import { DeskCard } from '../../kit';

/** "Complete your setup" on Today. Owners only, and gone once every step is done. */
export function SetupCard() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = useOwnerSession((state) => state.role);
  const list = useSetupChecklist(role === 'owner' ? venueId : '');
  if (!list || list.next === null) return null;

  return (
    <DeskCard style={styles.card}>
      <View style={styles.head}>
        <Text variant="title" accessibilityRole="header">
          {t('ownerDash.setup.title')}
        </Text>
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('ownerDash.setup.percent', { percent: list.percent })}
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={t('ownerDash.setup.title')}
        accessibilityValue={{ min: 0, max: 100, now: list.percent }}
        style={[styles.track, { backgroundColor: theme.wash }]}
      >
        <View style={[styles.fill, { width: `${list.percent}%`, backgroundColor: theme.fill }]} />
      </View>
      <View>
        {list.steps.map((step) => {
          const Icon = step.done ? CircleCheck : Circle;
          const label = t(`ownerDash.setup.steps.${step.id}`);
          return (
            <Pressable
              key={step.id}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ checked: step.done }}
              onPress={() => router.push(step.href as Href)}
              style={({ pressed }) => [
                styles.row,
                { borderTopColor: theme.line },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Icon size={20} color={step.done ? theme.success : theme.muted} />
              <Text
                variant="body"
                style={[
                  styles.label,
                  { color: step.done ? theme.meta : theme.text },
                  step.done && styles.doneLabel,
                ]}
              >
                {label}
              </Text>
              {step.done ? null : <ChevronRight size={18} color={theme.muted} />}
            </Pressable>
          );
        })}
      </View>
    </DeskCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: tokens.space[3] },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  // The bar's height carries no meaning; 8 reads clearly at a glance without shouting.
  track: { height: 8, borderRadius: tokens.radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: tokens.radius.full },
  row: {
    minHeight: tokens.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: { flex: 1 },
  doneLabel: { textDecorationLine: 'line-through' },
});

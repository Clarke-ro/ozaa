import { StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useSetupChecklist } from '../../data/useSetupChecklist';
import { Band } from './Band';
import { SectionHead } from './SectionHead';

// The track's height carries no meaning; 8 reads clearly at a glance without shouting.
const TRACK = tokens.space[2];

/**
 * "Finish setting up" as one slim band: how far along, a thin bar, and the next step with a
 * Continue link to it. Owners only, and gone once every step is done. The full list lives on
 * Setup. It is a link, not a button, so the only buttons on Today are the kitchen steps.
 */
export function SetupNudge() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = useOwnerSession((state) => state.role);
  const list = useSetupChecklist(role === 'owner' ? venueId : '');
  if (!list || list.next === null) return null;
  const next = list.next;

  return (
    <Band>
      <SectionHead
        title={t('ownerDash.setup.title')}
        meta={t('ownerDash.setup.percent', { percent: list.percent })}
        action={t('ownerDash.setup.continue')}
        onAction={() => router.push(next.href as Href)}
      />
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={t('ownerDash.setup.title')}
        accessibilityValue={{ min: 0, max: 100, now: list.percent }}
        style={[styles.track, { backgroundColor: theme.surface }]}
      >
        <View style={[styles.fill, { width: `${list.percent}%`, backgroundColor: theme.fill }]} />
      </View>
      <Text variant="body" style={{ color: theme.muted }} numberOfLines={2}>
        {t('ownerDash.setup.next', { step: t(`ownerDash.setup.steps.${next.id}`) })}
      </Text>
    </Band>
  );
}

const styles = StyleSheet.create({
  track: { height: TRACK, borderRadius: tokens.radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: tokens.radius.full },
});

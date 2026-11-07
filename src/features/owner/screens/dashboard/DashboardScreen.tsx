import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { LocationSwitcher } from '../../chrome/LocationSwitcher';
import { useOwnerLayout } from '../../chrome/layout';
import { DeskWait, OwnerPage, SkeletonBlock } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { LiveKitchen } from './LiveKitchen';
import { NeedsYouBar } from './NeedsYouBar';
import { QuickActions } from './QuickActions';
import { SetupNudge } from './SetupNudge';
import { TodayPulse } from './TodayPulse';

// Live data refreshes every few seconds while the screen is open; the kitchen moves fast.
const LIVE_MS = 5000;
const BAND_SKELETON = tokens.space[16] * 3;

/**
 * Today is one column of bands sitting straight on the page, the same order at every size: the
 * day's numbers first (the first thing an owner checks), then what needs you, the live kitchen,
 * setup (new venues) and shortcuts. Bands are split by thin lines, not boxed, and each has its
 * own shape (a big number, alert bars, ruled tickets, a line of pills), so they never look
 * alike. Nothing sits side by side in columns; lines of figures wrap like a sentence instead.
 * It uses the "wide" page width because it is a dashboard, so a desktop gets a full-width page.
 */
export function DashboardScreen() {
  const { t, i18n } = useTranslation();
  const { wide } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const firstName = useOwnerSession((state) => state.firstName);
  const desk = useQuery({
    queryKey: ownerKeys.dashboard(venueId),
    queryFn: () => api.ownerGetDashboard(venueId),
    enabled: Boolean(venueId),
    refetchInterval: LIVE_MS,
  });
  const d = desk.data;
  const date = new Date().toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <OwnerPage
      title={firstName ? t('ownerDash.greeting', { name: firstName }) : t('owner.dashboard')}
      subtitle={date}
      width="wide"
      bell
    >
      {/* Wide screens have the location at the top of the sidebar. */}
      {wide ? null : (
        <View style={styles.location}>
          <LocationSwitcher variant="chip" />
        </View>
      )}
      <DeskWait
        loading={desk.isLoading}
        error={desk.isError}
        onRetry={() => void desk.refetch()}
        skeleton={
          <>
            <SkeletonBlock height={BAND_SKELETON} />
            <SkeletonBlock height={BAND_SKELETON} />
          </>
        }
      >
        {d ? (
          <View style={styles.stack}>
            <TodayPulse dashboard={d} />
            <NeedsYouBar />
            <LiveKitchen venueId={venueId} />
            <SetupNudge />
            <QuickActions />
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  location: { flexDirection: 'row' },
  stack: { gap: tokens.space[6] },
});

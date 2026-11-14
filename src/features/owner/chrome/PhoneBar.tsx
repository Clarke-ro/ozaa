import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { isTabRoot } from './nav';
import { NotificationBell } from './NotificationBell';

const BACK = tokens.space[10];
// The page title is 30 px tall and starts 4 px down the page. Between these two scroll points
// it slides under the bar, so the bar's own small title fades in over the same distance.
const TITLE_FROM = 4;
const TITLE_TO = 34;

/**
 * Phones only: a slim bar above the page, like an iOS navigation bar with a large title.
 *
 * - No Cravins mark: the page's own big title says where you are (Clarke, 2026-11-14). Detail
 *   screens show Back, always in the same corner; the bell sits on the right.
 * - When the big page title scrolls away, the bar shows it instead, so you always know where you
 *   are (apple-look, wayfinding).
 * - The hairline under the bar only appears once content is under it (a scroll edge, not a
 *   fixed divider).
 */
export function PhoneBar({
  bell,
  title,
  scrollY,
  start,
}: {
  bell: boolean;
  title: string;
  /** Tab pages only: what sits on the left, e.g. Today's location switcher. It stays put, so the small title doesn't come in over it. */
  start?: ReactNode;
  /** How far the page has scrolled, from OwnerPage. */
  scrollY: SharedValue<number>;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const root = isTabRoot(role, path);

  // 0 at the top of the page, 1 once the big title has gone under the bar.
  const progress = (y: number) => {
    'worklet';
    return interpolate(y, [TITLE_FROM, TITLE_TO], [0, 1], Extrapolation.CLAMP);
  };
  const titleIn = useAnimatedStyle(() => {
    const p = progress(scrollY.get());
    // A short rise with the fade, so the title arrives from where the big one went (§7).
    return { opacity: p, transform: [{ translateY: (1 - p) * 6 }] };
  });
  const edge = useAnimatedStyle(() => ({ opacity: progress(scrollY.get()) }));

  // A tab with nothing for the bar to hold (Orders, Menu) gets no bar at all: its title starts
  // right under the status bar, iOS large-title style (Clarke, 2026-11-14).
  if (root && !start && !bell) {
    return <View style={{ height: insets.top + tokens.space[3], backgroundColor: theme.bg }} />;
  }

  return (
    <View
      style={[styles.bar, { paddingTop: insets.top + tokens.space[2], backgroundColor: theme.bg }]}
    >
      {root ? (
        start ? (
          <View style={styles.start}>{start}</View>
        ) : null
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('owner.back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/owner/more'))}
          hitSlop={4}
          style={({ pressed }) => [
            styles.back,
            { backgroundColor: pressed ? theme.line : theme.wash },
          ]}
        >
          <ChevronLeft size={22} color={theme.text} />
        </Pressable>
      )}
      {/* The small title. Screen readers already have the page's own header, so it stays silent. */}
      {root && start ? null : (
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.title, root ? styles.titleRoot : styles.titleDetail, titleIn]}
        >
          <Text variant="body-strong" numberOfLines={1} style={styles.titleText}>
            {title}
          </Text>
        </Animated.View>
      )}
      <View style={styles.spacer} />
      {bell ? <NotificationBell /> : null}
      <Animated.View
        pointerEvents="none"
        style={[styles.edge, { backgroundColor: theme.line }, edge]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[2],
  },
  back: {
    width: BACK,
    height: BACK,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Laid over the bar's content row, between the left control and the bell, so it never pushes
  // them about as it fades.
  title: { position: 'absolute', bottom: tokens.space[2], height: BACK, justifyContent: 'center' },
  titleRoot: { left: tokens.space[4], right: tokens.space[16] },
  titleDetail: { left: tokens.space[4] + BACK + tokens.space[3], right: tokens.space[16] },
  titleText: { fontSize: 17, lineHeight: 22, fontFamily: fontFamily.strong },
  start: { flexShrink: 1, minWidth: 0, marginRight: tokens.space[3] },
  spacer: { flex: 1 },
  edge: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
});

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { useOwnerLayout } from './layout';
import { navFor } from './nav';
import { PageHeader } from './PageHeader';
import { PhoneBar } from './PhoneBar';

export { DeskWait, SkeletonBlock } from './DeskWait';

/** Page margin: 16 on phones, 24 on tablets, 32 on desktops. */
export function useGutter() {
  return useOwnerLayout().gutter;
}

/**
 * Every owner screen sits in this. The page starts with its own header (a bold title, a grey
 * line under it, the screen's one action on the right), then the content, in one centred column
 * on the page colour. Wide screens have no bar above it and no bell: the sidebar's Notifications
 * row and its count do that job. Phones get a slim bar with Back (or a page's own `barStart`) and
 * the bell, and no grey line under the title.
 * `width="form"` keeps settings and Today at a readable width; `wide` is for long lists.
 */
export function OwnerPage({
  title,
  subtitle,
  action,
  footer,
  width = 'form',
  bell,
  back,
  barStart,
  compactTitle,
  children,
}: {
  title: string;
  /** The grey line under the title. Wide screens only: phones keep the space for content. */
  subtitle?: string;
  /** The screen's single main action, shown on the right of the title. */
  action?: ReactNode;
  /** Pinned under the scroll area, e.g. a SaveBar. */
  footer?: ReactNode;
  /** Column width from the canvas: form 900 (Today, Floor, Calls, settings), mid 1000 (Menu, Tables, Sales, Insights, Loyalty), wide 1240 (Orders). */
  width?: 'form' | 'mid' | 'wide';
  /** Show the bell in the phone bar. Wide screens use the sidebar's Notifications row instead. */
  bell?: boolean;
  /** For a page opened from another page: a Back link above the title on wide screens. */
  back?: { label: string; onPress: () => void };
  /** Phones: what sits at the left of the top bar on a tab, e.g. Today's location switcher. */
  barStart?: ReactNode;
  /** A smaller title on phones, for a long one like Today's greeting. */
  compactTitle?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  const { wide, gutter } = useOwnerLayout();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const mayNotify = navFor(role).some((item) => item.id === 'notifications');
  const frame = { maxWidth: tokens.owner.page[width] + gutter * 2, paddingHorizontal: gutter };
  // How far the page has scrolled, read on the UI thread so the phone bar follows the finger.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.fill, { backgroundColor: theme.bg }]}
    >
      {wide ? null : (
        <PhoneBar
          bell={mayNotify && Boolean(bell)}
          title={title}
          scrollY={scrollY}
          start={barStart}
        />
      )}
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.page, frame, wide && styles.pageWide]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <PageHeader
          title={title}
          // Phones drop the grey line under the title: the title and the content say enough.
          subtitle={wide ? subtitle : undefined}
          action={action}
          bell={false}
          back={back}
          compact={compactTitle && !wide}
        />
        <View style={[styles.body, wide && styles.bodyWide]}>{children}</View>
      </Animated.ScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: {
    // Phones: the title starts just under the bar, iOS large-title style.
    paddingTop: tokens.space[1],
    paddingBottom: tokens.space[16] + tokens.space[8],
    gap: tokens.space[4],
    width: '100%',
    alignSelf: 'center',
  },
  // Canvas spacing on wide screens: 40 px above the title, 32 px between the header and each section.
  pageWide: {
    paddingTop: tokens.owner.controls.pagePadding,
    gap: tokens.owner.controls.sectionGap,
  },
  body: { gap: tokens.space[5] },
  bodyWide: { gap: tokens.owner.controls.sectionGap },
});

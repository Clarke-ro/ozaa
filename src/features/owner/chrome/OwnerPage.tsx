import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { useOwnerLayout } from './layout';
import { isTabRoot, navFor } from './nav';
import { NotificationBell } from './NotificationBell';

export { DeskWait, SkeletonBlock } from './DeskWait';

/** Page margin: 16 on phones, 24 on tablets, 32 on desktops. */
export function useGutter() {
  return useOwnerLayout().gutter;
}

/**
 * Every owner screen sits in this: a header with Back (phones, detail screens), the title, one
 * optional action and the bell, then the scrolling page.
 * `width="form"` keeps settings and forms at a readable width; `wide` is for dashboards and lists.
 */
export function OwnerPage({
  title,
  subtitle,
  action,
  footer,
  width = 'form',
  bell,
  children,
}: {
  title: string;
  subtitle?: string;
  /** The screen's single main action, shown in the header next to the title. */
  action?: ReactNode;
  /** Pinned under the scroll area, e.g. a SaveBar. */
  footer?: ReactNode;
  width?: 'form' | 'wide';
  /** Show the bell on phones too (wide screens always show it). */
  bell?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  const { wide, gutter } = useOwnerLayout();
  const insets = useSafeAreaInsets();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const mayNotify = navFor(role).some((item) => item.id === 'notifications');
  const showBell = mayNotify && (wide || bell);
  // The header and the page share one width, so the title lines up with the content under it.
  const frame = { maxWidth: tokens.owner.page[width] + gutter * 2, paddingHorizontal: gutter };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.fill, { backgroundColor: theme.bg }]}
    >
      <View
        style={[
          styles.bar,
          wide && styles.barWide,
          {
            paddingTop: insets.top + (wide ? 0 : tokens.space[2]),
            borderBottomColor: theme.line,
            backgroundColor: theme.surface,
          },
        ]}
      >
        <View style={[styles.barInner, frame]}>
          <BackButton />
          <Text
            variant={wide ? 'display-m' : 'title'}
            accessibilityRole="header"
            numberOfLines={1}
            style={styles.barTitle}
          >
            {title}
          </Text>
          {action ? <View style={styles.action}>{action}</View> : null}
          {showBell ? <NotificationBell /> : null}
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[styles.page, frame, wide && styles.pageWide]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {subtitle ? (
          <Text variant="body" style={{ color: theme.muted }}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}

function BackButton() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const path = usePathname();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const { wide } = useOwnerLayout();
  // On wide screens every section sits in the sidebar, so each page is a root with nothing to go back to.
  if (wide || isTabRoot(role, path)) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('owner.back')}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/owner/more'))}
      hitSlop={4}
      style={({ pressed }) => [styles.back, { backgroundColor: pressed ? theme.line : theme.wash }]}
    >
      <ChevronLeft size={22} color={theme.text} />
    </Pressable>
  );
}

const BACK = tokens.space[10];

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: {
    paddingTop: tokens.space[4],
    paddingBottom: tokens.space[16] + tokens.space[8],
    gap: tokens.space[4],
    width: '100%',
    alignSelf: 'center',
  },
  pageWide: { paddingTop: tokens.space[6], gap: tokens.space[6] },
  // Sits in front of the title on the same line, so detail screens lose no height to it.
  back: {
    width: BACK,
    height: BACK,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  bar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: tokens.space[2] },
  barWide: { paddingBottom: 0, justifyContent: 'center', minHeight: tokens.owner.topBar },
  barInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: tokens.touchTarget,
    width: '100%',
    alignSelf: 'center',
  },
  barTitle: { flex: 1 },
  action: { flexShrink: 0 },
});

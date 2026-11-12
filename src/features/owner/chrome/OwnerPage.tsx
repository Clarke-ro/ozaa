import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { useOwnerLayout } from './layout';
import { navFor } from './nav';
import { PageHeader } from './PageHeader';
import { PhoneBar } from './PhoneBar';

export { DeskWait, SkeletonBlock } from './DeskWait';

/** Page margin: 16 on phones, 24 on tablets, 40 on desktops. */
export function useGutter() {
  return useOwnerLayout().gutter;
}

/**
 * Every owner screen sits in this. The page starts with its own header (a bold title, a grey
 * line under it, the screen's one action and the bell on the right), then the content, in one
 * centred column on the page colour. Wide screens have no bar above it; the sidebar does that
 * job. Phones get a slim bar with the Cravins mark (or Back on detail screens) and the bell.
 * Every page fills the window between equal side margins; `width` is kept so callers still
 * type-check, and is no longer used to narrow the page.
 */
export function OwnerPage({
  title,
  subtitle,
  action,
  footer,
  bell,
  back,
  children,
}: {
  title: string;
  subtitle?: string;
  /** The screen's single main action, shown on the right of the title. */
  action?: ReactNode;
  /** Pinned under the scroll area, e.g. a SaveBar. */
  footer?: ReactNode;
  width?: 'form' | 'wide';
  /** Show the bell on phones too (wide screens always show it). */
  bell?: boolean;
  /** For a page opened from another page: a Back link above the title on wide screens. */
  back?: { label: string; onPress: () => void };
  children: ReactNode;
}) {
  const theme = useTheme();
  const { wide, gutter } = useOwnerLayout();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const mayNotify = navFor(role).some((item) => item.id === 'notifications');
  // Content fills the window with the same margin on both sides, never a centred column, so
  // every page lines up with the sidebar the same way (Clarke, 2026-11-12).
  const frame = { paddingHorizontal: gutter };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.fill, { backgroundColor: theme.bg }]}
    >
      {wide ? null : <PhoneBar bell={mayNotify && Boolean(bell)} />}
      <ScrollView
        contentContainerStyle={[styles.page, frame, wide && styles.pageWide]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <PageHeader
          title={title}
          subtitle={subtitle}
          action={action}
          bell={wide && mayNotify}
          back={back}
        />
        <View style={styles.body}>{children}</View>
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: {
    paddingTop: tokens.space[4],
    paddingBottom: tokens.space[16] + tokens.space[8],
    gap: tokens.space[5],
    width: '100%',
  },
  pageWide: { paddingTop: tokens.space[8], gap: tokens.space[6] },
  body: { gap: tokens.space[4], width: '100%' },
});

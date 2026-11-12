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

/** Page margin: 16 on phones, 24 on tablets, 32 on desktops. */
export function useGutter() {
  return useOwnerLayout().gutter;
}

/**
 * Every owner screen sits in this. The page starts with its own header (a bold title, a grey
 * line under it, the screen's one action and the bell on the right), then the content, in one
 * centred column on the page colour. Wide screens have no bar above it; the sidebar does that
 * job. Phones get a slim bar with the Cravins mark (or Back on detail screens) and the bell.
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
  // The header always spans the full page, so the title and the bell sit in the same place on
  // every screen. Only the content under it narrows to a readable width on form pages.
  const frame = { maxWidth: tokens.owner.page.wide + gutter * 2, paddingHorizontal: gutter };

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
        <View style={[styles.body, { maxWidth: tokens.owner.page[width] }]}>{children}</View>
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
    alignSelf: 'center',
  },
  pageWide: { paddingTop: tokens.space[8], gap: tokens.space[6] },
  body: { gap: tokens.space[4], width: '100%' },
});

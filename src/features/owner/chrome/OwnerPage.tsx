import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, CloudOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { isTabRoot } from './nav';

// 16 pt margins on phones, 24 on tablets and up (HIG layout margins).
function useGutter() {
  const { width } = useWindowDimensions();
  return width >= 768 ? tokens.space[6] : tokens.space[4];
}

/**
 * Every owner screen sits in this: safe scroll area, back button on detail screens,
 * the title, an optional line under it, and one optional action on the right.
 */
export function OwnerPage({
  title,
  subtitle,
  action,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  /** The screen's single main action, shown in the header next to the title. */
  action?: ReactNode;
  /** Pinned under the scroll area, e.g. a SaveBar. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  const gutter = useGutter();
  const insets = useSafeAreaInsets();
  const home = usePathname() === '/owner';
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.fill, { backgroundColor: theme.bg }]}
    >
      {/* Today has the brand bar above it; every other page puts its own title in the header row instead. */}
      {home ? null : (
        <View
          style={[
            styles.bar,
            {
              paddingTop: insets.top + tokens.space[2],
              paddingHorizontal: gutter,
              borderBottomColor: theme.line,
              backgroundColor: theme.bg,
            },
          ]}
        >
          <View style={styles.barInner}>
            <BackButton />
            <Text
              variant="title"
              accessibilityRole="header"
              numberOfLines={1}
              style={styles.barTitle}
            >
              {title}
            </Text>
            {action ? <View style={styles.action}>{action}</View> : null}
          </View>
        </View>
      )}
      <ScrollView
        contentContainerStyle={[styles.page, { paddingHorizontal: gutter }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {home ? (
          <View style={styles.headRow}>
            <Text variant="display-m" accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            {action ? <View style={styles.action}>{action}</View> : null}
          </View>
        ) : null}
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
  if (isTabRoot(role, path)) return null;
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

/** Grey blocks in the shape of the content while it loads, so nothing jumps when it arrives. */
export function SkeletonBlock({
  height = 72,
  width = '100%',
}: {
  height?: number;
  width?: number | `${number}%`;
}) {
  const theme = useTheme();
  return (
    <View style={{ height, width, borderRadius: tokens.radius.md, backgroundColor: theme.wash }} />
  );
}

export function DeskWait({
  loading,
  error,
  onRetry,
  children,
  skeleton,
}: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  children: ReactNode;
  /** Optional custom skeleton; by default three card-sized blocks. */
  skeleton?: ReactNode;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (loading) {
    return (
      <View
        style={styles.wait}
        accessibilityRole="progressbar"
        accessibilityLabel={t('errors.loading')}
      >
        {skeleton ?? (
          <>
            <SkeletonBlock height={96} />
            <SkeletonBlock />
            <SkeletonBlock />
          </>
        )}
      </View>
    );
  }
  if (error) {
    return (
      <View
        style={[styles.error, { borderColor: theme.line, backgroundColor: theme.surface }]}
        accessibilityRole="alert"
      >
        <CloudOff size={28} color={theme.muted} />
        <Text variant="body" style={styles.center}>
          {t('ownerKit.loadFailed')}
        </Text>
        <Button label={t('ownerKit.tryAgain')} onPress={onRetry} tone="secondary" size="md" />
      </View>
    );
  }
  return children;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: {
    paddingTop: tokens.space[4],
    paddingBottom: tokens.space[16] + tokens.space[8],
    gap: tokens.space[4],
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
  },
  // Sits in front of the title on the same line, so detail screens lose no height to it.
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  bar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: tokens.space[2] },
  barInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: 44,
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
  },
  barTitle: { flex: 1 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  title: { flex: 1 },
  action: { flexShrink: 0 },
  wait: { gap: tokens.space[3] },
  error: {
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[6],
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  center: { textAlign: 'center' },
});

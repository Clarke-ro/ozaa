import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CloudOff } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

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

/** Loading (skeleton), error (plain sentence and Try again), or the content (BUILD.md section 7). */
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
  wait: { gap: tokens.space[3] },
  error: {
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[6],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  center: { textAlign: 'center' },
});

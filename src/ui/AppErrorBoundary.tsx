import { useEffect } from 'react';
import type { ErrorBoundaryProps } from 'expo-router';
import { reportError } from '@/lib/monitor';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useAppFonts } from '@/theme/fonts';
import { tokens } from '@/theme/tokens';
import { Button } from './Button';
import { Text } from './Text';
import { useTheme } from './theme';

/**
 * Shown when a screen crashes while drawing. The root layout exports it, so expo-router puts it
 * in place of the broken screen. It sits outside the layout's providers, which is why it reads
 * the default theme and pads itself instead of using SafeScreen.
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  // The layout that loads the fonts may be the part that crashed, so load them here too.
  useAppFonts();
  // A crash that reached this screen is a bug: send it to monitoring (scrubbed, web only).
  useEffect(() => reportError(error), [error]);
  return (
    <View style={[styles.page, { backgroundColor: theme.bg }]} accessibilityRole="alert">
      <Text variant="display-m">{t('errors.crashTitle')}</Text>
      <Text variant="body" style={{ color: theme.muted }}>
        {t('errors.crashBody')}
      </Text>
      {/* The message helps while building; guests never see it. */}
      {__DEV__ ? (
        <Text variant="caption" style={{ color: theme.meta }}>
          {error.message}
        </Text>
      ) : null}
      <Button label={t('errors.tryAgain')} onPress={() => void retry()} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    padding: tokens.space[8],
    gap: tokens.space[4],
  },
});

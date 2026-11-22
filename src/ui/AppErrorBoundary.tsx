import { useEffect, useRef } from 'react';
import type { ErrorBoundaryProps } from 'expo-router';
import { reportError } from '@/lib/monitor';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { useAppFonts } from '@/theme/fonts';
import { tokens } from '@/theme/tokens';
import { Button } from './Button';
import { isChunkLoadError, lastOpenedPath, shouldReloadForUpdate } from './chunkError';
import { useOnline } from './OfflineNote';
import { Text } from './Text';
import { useTheme } from './theme';

/**
 * Shown when a screen crashes while drawing. The root layout exports it, so expo-router puts it
 * in place of the broken screen. It sits outside the layout's providers, which is why it reads
 * the default theme and pads itself instead of using SafeScreen.
 */
// When the page last reloaded to pick up a new version (chunkError.ts).
const RELOAD_KEY = 'cravins:reloaded-for-update';

export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  // The layout that loads the fonts may be the part that crashed, so load them here too.
  useAppFonts();
  const online = useOnline();
  // A page whose code file didn't download isn't a bug in the page (see chunkError.ts).
  const chunk = isChunkLoadError(error);
  // Whether the download failed because the phone was offline (then just try again once back).
  const failedOffline = useRef(!online);
  useEffect(() => {
    if (!chunk) {
      // A crash that reached this screen is a bug: send it to monitoring (scrubbed, web only).
      reportError(error);
      return;
    }
    if (!online || Platform.OS !== 'web') return;
    if (failedOffline.current) {
      // Back online after a dropped connection: open the page the person was on. The router fell
      // back to "/" when the load failed, so go to their page by address. Clerk keeps owners
      // signed in across this (the demo, which lives in memory, asks to sign in again).
      failedOffline.current = false;
      window.location.assign(lastOpenedPath() ?? '/');
      return;
    }
    // Online and the file is gone: a new version was deployed. Reload once to get it.
    let last: number | null = null;
    try {
      last = Number(sessionStorage.getItem(RELOAD_KEY)) || null;
    } catch {
      // Storage blocked: still reload; the guard just can't remember.
    }
    if (shouldReloadForUpdate(last, Date.now())) {
      try {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      } catch {
        // See above.
      }
      window.location.reload();
    } else {
      reportError(error);
    }
  }, [error, chunk, online]);
  return (
    <View style={[styles.page, { backgroundColor: theme.bg }]} accessibilityRole="alert">
      <Text variant="display-m">
        {t(chunk && !online ? 'errors.offlinePageTitle' : 'errors.crashTitle')}
      </Text>
      <Text variant="body" style={{ color: theme.muted }}>
        {t(chunk && !online ? 'errors.offlinePage' : 'errors.crashBody')}
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

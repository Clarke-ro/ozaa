import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, type Query } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { applyTextDirection, textDirection } from '@/i18n/direction';
import { applySavedLanguage } from '@/features/venue';
import { pausePollingInBackground } from '@/lib/queryLifecycle';
import { shouldPersistQuery } from '@/lib/queryPersist';
import { GestureRoot } from '@/ui/GestureRoot';
import { useAppFonts } from '@/theme/fonts';
import { ThemeProvider, ozaaTheme } from '@/ui/theme';

// expo-router shows this in place of any screen that throws while rendering.
export { AppErrorBoundary as ErrorBoundary } from '@/ui/AppErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const STALE_MS = 30_000;
const PERSIST_MAX_AGE_MS = 60 * 60 * 1000;
// Bump when the saved shape changes: older saves are thrown away. v2 dropped owner data.
const PERSIST_BUSTER = 'v2';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: STALE_MS } },
});

const persister = createAsyncStoragePersister({ storage: AsyncStorage });
const persistOptions = {
  persister,
  maxAge: PERSIST_MAX_AGE_MS,
  buster: PERSIST_BUSTER,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) => shouldPersistQuery(query.queryKey, query.state.status),
  },
};
pausePollingInBackground();

function DirectionFrame({ children }: { children: ReactNode }) {
  const { i18n: current } = useTranslation();
  const dir = textDirection(current.language);
  useEffect(() => {
    applyTextDirection(current.language);
    const sync = (code: string) => applyTextDirection(code);
    current.on('languageChanged', sync);
    return () => {
      current.off('languageChanged', sync);
    };
  }, [current]);
  return <View style={{ flex: 1, direction: dir }}>{children}</View>;
}

export default function RootLayout() {
  const fontsReady = useAppFonts();
  useEffect(() => {
    void applySavedLanguage();
  }, []);
  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady]);
  if (!fontsReady) return null;
  return (
    <GestureRoot>
      <I18nextProvider i18n={i18n}>
        <DirectionFrame>
          <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
            <SafeAreaProvider>
              <ThemeProvider theme={ozaaTheme}>
                {/* Guest pages are always light; the owner chrome sets its own style. */}
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false }} />
              </ThemeProvider>
            </SafeAreaProvider>
          </PersistQueryClientProvider>
        </DirectionFrame>
      </I18nextProvider>
    </GestureRoot>
  );
}

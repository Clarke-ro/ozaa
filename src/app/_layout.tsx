import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient } from '@tanstack/react-query';
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
import { GestureRoot } from '@/ui/GestureRoot';
import { useAppFonts } from '@/theme/fonts';
import { ThemeProvider, ozaaTheme } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const persister = createAsyncStoragePersister({ storage: AsyncStorage });
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
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister, maxAge: 1000 * 60 * 60 }}
          >
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

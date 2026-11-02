import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { applySavedLanguage } from '@/features/venue';
import { useAppFonts } from '@/theme/fonts';
import { ThemeProvider, ozaaTheme } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const persister = createAsyncStoragePersister({ storage: AsyncStorage });

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nextProvider i18n={i18n}>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 1000 * 60 * 60 }}>
          <SafeAreaProvider>
            <ThemeProvider theme={ozaaTheme}>
              <Stack screenOptions={{ headerShown: false }} />
            </ThemeProvider>
          </SafeAreaProvider>
        </PersistQueryClientProvider>
      </I18nextProvider>
    </GestureHandlerRootView>
  );
}

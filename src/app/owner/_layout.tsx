import { Redirect, Stack, usePathname } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useOwnerSession } from '@/features/session';
import { OwnerChrome } from '@/features/owner';
import { ozaaDarkTheme, ozaaTheme, ThemeProvider } from '@/ui/theme';

export default function OwnerLayout() {
  const token = useOwnerSession((state) => state.accessToken);
  const hydrated = useOwnerSession((state) => state.hydrated);
  const path = usePathname();
  // The owner app follows the phone's light or dark setting. Guest pages stay light.
  const theme = useColorScheme() === 'dark' ? ozaaDarkTheme : ozaaTheme;
  const login = path === '/owner/login';
  if (!hydrated) return null;
  if (!token && !login) return <Redirect href="/owner/login" />;
  if (login) {
    return (
      <ThemeProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    );
  }
  return (
    <ThemeProvider theme={theme}>
      <OwnerChrome>
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}
        />
      </OwnerChrome>
    </ThemeProvider>
  );
}

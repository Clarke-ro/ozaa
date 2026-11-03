import { Redirect, Stack, usePathname } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useOwnerSession } from '@/features/session';
import { OwnerChrome } from '@/features/owner';
import { ozaaOwnerDarkTheme, ozaaOwnerTheme, ThemeProvider } from '@/ui/theme';

export default function OwnerLayout() {
  const token = useOwnerSession((state) => state.accessToken);
  const hydrated = useOwnerSession((state) => state.hydrated);
  const role = useOwnerSession((state) => state.role);
  const path = usePathname();
  // The owner app follows the phone's light or dark setting. Guest pages stay light.
  const theme = useColorScheme() === 'dark' ? ozaaOwnerDarkTheme : ozaaOwnerTheme;
  const login = path === '/owner/login';
  if (!hydrated) return null;
  if (!token && !login) return <Redirect href="/owner/login" />;
  // Already signed in: skip the form and land where sign-in would have sent them.
  if (token && login) return <Redirect href={role === 'kitchen' ? '/owner/orders' : '/owner'} />;
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

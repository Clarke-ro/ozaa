import { Redirect, Slot, usePathname } from 'expo-router';
import { useOwnerSession } from '@/features/session';
import { OwnerChrome } from '@/features/owner';
import { ozaaTheme, ThemeProvider } from '@/ui/theme';

export default function OwnerLayout() {
  const token = useOwnerSession((state) => state.accessToken);
  const path = usePathname();
  const login = path === '/owner/login';
  if (!token && !login) return <Redirect href="/owner/login" />;
  if (login) return <Slot />;
  return (
    <ThemeProvider theme={ozaaTheme}>
      <OwnerChrome>
        <Slot />
      </OwnerChrome>
    </ThemeProvider>
  );
}

import { useColorScheme } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { guestScheme, isPublished, menuStyleOf } from '@/lib/menuStyle';
import { NotOpenState } from '@/ui/states';
import { z } from 'zod/mini';
import { themeFromAccent, ThemeProvider } from '@/ui/theme';
import { useVenue } from '@/features/venue';
import type { FontPair } from '@/ui/theme';

const slugSchema = z.string().check(z.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/));

export default function VenueLayout() {
  const params = useLocalSearchParams<{ venue: string }>();
  const parsed = slugSchema.safeParse(params.venue);
  const slug = parsed.success ? parsed.data : '';
  const venue = useVenue(slug);
  const font = venue.data?.theme.fontPair;
  const fontPair: FontPair = font === 'serif' || font === 'bold' || font === 'ozaa' ? font : 'ozaa';
  const phone = useColorScheme();
  // Light unless the venue chose dark, or chose auto and the guest's phone is dark.
  const scheme = guestScheme(menuStyleOf(venue.data?.menuStyle).colorScheme, phone);
  const theme = themeFromAccent(venue.data?.theme.accent, fontPair, scheme);
  return (
    <ThemeProvider theme={theme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {/* Until the owner publishes, every guest page shows the same "not open yet" page. */}
      {venue.data && !isPublished(venue.data) ? (
        <NotOpenState />
      ) : (
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}
        />
      )}
    </ThemeProvider>
  );
}

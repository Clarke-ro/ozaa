import { Stack, useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { themeFromAccent, ThemeProvider } from '@/ui/theme';
import { useVenue } from '@/features/venue';
import type { FontPair } from '@/ui/theme';

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export default function VenueLayout() {
  const params = useLocalSearchParams<{ venue: string }>();
  const parsed = slugSchema.safeParse(params.venue);
  const slug = parsed.success ? parsed.data : '';
  const venue = useVenue(slug);
  const font = venue.data?.theme.fontPair;
  const fontPair: FontPair = font === 'serif' || font === 'bold' || font === 'ozaa' ? font : 'ozaa';
  const theme = themeFromAccent(venue.data?.theme.accent, fontPair);
  return (
    <ThemeProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="story/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="menu/[item]" options={{ presentation: 'transparentModal' }} />
        <Stack.Screen name="order" options={{ presentation: 'transparentModal' }} />
      </Stack>
    </ThemeProvider>
  );
}

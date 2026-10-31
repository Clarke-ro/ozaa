import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { useTheme } from '@/ui/theme';

export function StoryScreen({ slug, id }: { slug: string; id: string }) {
  const theme = useTheme();
  const router = useRouter();
  const stories = useQuery({ queryKey: ['stories', slug], queryFn: () => api.listStories(slug) });
  const story = stories.data?.items.find((item) => item.id === id) ?? stories.data?.items[0];
  if (!story) return null;
  return (
    <View style={{ flex: 1, backgroundColor: theme.black }}>
      <VenueImage url={story.poster.url} alt={story.firstName} style={StyleSheet.absoluteFill} />
      <View style={styles.top}>
        <Text variant="body-strong" style={{ color: '#fff' }}>{story.firstName}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()}>
          <Text style={{ color: '#fff' }}>Close</Text>
        </Pressable>
      </View>
      <View style={styles.bottom}>
        <Text variant="body" style={{ color: '#fff' }}>{story.quote}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingTop: 48, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between' },
  bottom: { marginTop: 'auto', padding: 20 },
});

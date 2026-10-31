import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { Story } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { useTheme } from '@/ui/theme';

export function StoryRow({
  stories,
  onOpen,
}: {
  slug?: string;
  stories: Story[];
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (stories.length === 0) return null;
  return (
    <View style={{ marginTop: 28 }}>
      <View style={styles.head}>
        <Text variant="display-m">{t('home.stories')}</Text>
        <Text variant="caption" style={[styles.sample, { backgroundColor: theme.wash, color: theme.muted }]}>
          {t('home.sample')}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {stories.map((story) => (
          <Pressable
            key={story.id}
            accessibilityRole="button"
            accessibilityLabel={`${story.firstName}, ${story.stars} stars`}
            onPress={() => onOpen(story.id)}
            style={styles.item}
          >
            <View style={[styles.ring, { borderColor: theme.fill }]}>
              {story.avatar ? (
                <VenueImage url={story.avatar.url} alt="" style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.wash }]} />
              )}
            </View>
            <Text variant="caption" style={styles.name}>
              {story.firstName}
            </Text>
            <View style={styles.stars}>
              <Star color={theme.black} size={11} fill={theme.black} />
              <Text variant="caption">{story.stars.toFixed(1)}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: tokens.grid.mobile.margin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sample: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  row: { paddingHorizontal: 20, gap: 14 },
  item: { width: 72, alignItems: 'center' },
  ring: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, padding: 3 },
  avatar: { width: '100%', height: '100%', borderRadius: 30 },
  name: { marginTop: 6, fontFamily: 'Inter_600' },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});

import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { MenuCategory, MenuItem } from '@/lib/api/types';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { useTheme } from '@/ui/theme';

/**
 * Sections as round pictures, using each section's first dish photo, with the name underneath.
 * The picked section gets a ring and bold label, so it is not shown by colour alone.
 */
export function SectionRail({
  sections,
  items,
  active,
  onPick,
}: {
  sections: MenuCategory[];
  items: MenuItem[];
  active: string | undefined;
  onPick: (id: string) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {sections.map((section) => {
        const on = section.id === active;
        const photo = items.find((i) => i.categoryId === section.id && i.photo)?.photo;
        return (
          <Pressable
            key={section.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            accessibilityLabel={section.name.en}
            onPress={() => onPick(section.id)}
            style={styles.item}
          >
            <View style={[styles.ring, { borderColor: on ? theme.fill : 'transparent' }]}>
              <View style={[styles.circle, { backgroundColor: theme.wash }]}>
                {photo ? (
                  <VenueImage url={photo.url} alt="" style={StyleSheet.absoluteFill} />
                ) : (
                  <Text variant="title" style={{ color: theme.muted }}>
                    {section.name.en.slice(0, 1)}
                  </Text>
                )}
              </View>
            </View>
            <Text
              variant="caption"
              numberOfLines={1}
              style={{
                color: on ? theme.text : theme.muted,
                fontFamily: on ? 'Inter_600' : 'Inter_400',
              }}
            >
              {section.name.en}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 20, gap: 14, paddingVertical: 4 },
  item: { alignItems: 'center', gap: 6, width: 68 },
  ring: { borderWidth: 2, borderRadius: 34, padding: 2 },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

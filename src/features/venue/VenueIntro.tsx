import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { VenuePublic } from '@/lib/api/types';
import { Text } from '@/ui/Text';
import { tokens } from '@/theme/tokens';
import { fontFamily, useTheme } from '@/ui/theme';

// Two lines is enough to set the scene; the rest is one tap away, so the services stay above the fold.
const DESCRIPTION_LINES = 2;

/** Venue name, its tagline and a short description. */
export function VenueIntro({ venue }: { venue: VenuePublic }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const description = venue.description.en?.trim();

  return (
    <View style={styles.wrap}>
      <Text variant="display-m" accessibilityRole="header" numberOfLines={2}>
        {venue.name}
      </Text>
      {venue.tagline ? (
        <Text variant="body-strong" style={[styles.small, { color: theme.ink }]} numberOfLines={1}>
          {venue.tagline}
        </Text>
      ) : null}
      {description ? (
        <Pressable
          accessibilityRole={clamped ? 'button' : 'text'}
          accessibilityHint={clamped && !expanded ? t('home.moreHint') : undefined}
          disabled={!clamped}
          onPress={() => setExpanded((open) => !open)}
        >
          <Text
            variant="caption"
            style={[styles.description, { color: theme.muted }]}
            numberOfLines={expanded ? undefined : DESCRIPTION_LINES}
            onTextLayout={(e) => {
              if (!expanded && e.nativeEvent.lines.length > DESCRIPTION_LINES) setClamped(true);
            }}
          >
            {description}
          </Text>
          {clamped ? (
            <Text variant="caption" style={[styles.more, { color: theme.ink }]}>
              {expanded ? t('home.less') : t('home.more')}
            </Text>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[1] },
  small: { fontSize: tokens.type.caption.size + 1, lineHeight: tokens.type.caption.line + 2 },
  description: {
    fontSize: tokens.type.caption.size + 1,
    lineHeight: tokens.type.caption.line + 2,
  },
  more: { fontFamily: fontFamily.strong, marginTop: 2 },
});

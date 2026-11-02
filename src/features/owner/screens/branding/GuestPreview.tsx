import { StyleSheet, View } from 'react-native';
import { ImageIcon } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { makeStyles } from '@/ui/makeStyles';
import { Text } from '@/ui/Text';
import { themeFromAccent, ThemeProvider, useTheme } from '@/ui/theme';
import { VenueImage } from '@/ui/VenueImage';

export type GuestPreviewProps = {
  accent: string | null;
  name: string;
  tagline: string;
  description: string;
  hoursText?: string;
  locationLabel?: string;
  bannerUrl?: string | null;
  buttons: { key: string; label: string }[];
  /** Text colour on the first (filled) button, from the owner's light/dark/auto choice. */
  buttonInk: string;
};

/**
 * The guest home page as guests will see it. Guest pages are always light and use the venue
 * colour, so the preview gets its own light theme even when the owner app is in dark mode.
 */
export function GuestPreview(props: GuestPreviewProps) {
  return (
    <ThemeProvider theme={themeFromAccent(props.accent, 'ozaa', 'light')}>
      <Frame {...props} />
    </ThemeProvider>
  );
}

function Frame({
  name,
  tagline,
  description,
  hoursText,
  locationLabel,
  bannerUrl,
  buttons,
  buttonInk,
}: GuestPreviewProps) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View
      style={styles.frame}
      accessible
      accessibilityLabel={`Preview of the guest page for ${name}`}
    >
      {bannerUrl ? (
        <VenueImage url={bannerUrl} alt={name} style={styles.banner} />
      ) : (
        <View style={styles.bannerEmpty}>
          <ImageIcon size={24} color={theme.meta} />
          <Text variant="caption" style={{ color: theme.muted }}>
            No cover photo yet
          </Text>
        </View>
      )}
      <View style={styles.content}>
        <Text variant="display-m">{name || 'Your venue name'}</Text>
        {tagline ? (
          <Text variant="body-strong" style={{ color: theme.ink }}>
            {tagline}
          </Text>
        ) : null}
        {description ? (
          <Text variant="body" style={{ color: theme.muted }}>
            {description}
          </Text>
        ) : null}
        <View style={styles.chips}>
          {hoursText ? (
            <Text variant="caption" style={styles.chip}>
              {hoursText}
            </Text>
          ) : null}
          {locationLabel ? (
            <Text variant="caption" style={[styles.chip, { color: theme.muted }]}>
              {locationLabel}
            </Text>
          ) : null}
        </View>
        <View style={styles.buttons}>
          {buttons.map((button, index) => (
            <View
              key={button.key}
              style={[
                styles.button,
                index === 0 ? { backgroundColor: theme.fill } : styles.outline,
              ]}
            >
              <Text variant="button" style={{ color: index === 0 ? buttonInk : theme.text }}>
                {button.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  frame: {
    backgroundColor: theme.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: theme.line,
    overflow: 'hidden',
  },
  banner: { height: 140, width: '100%' },
  bannerEmpty: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[1],
    backgroundColor: theme.wash,
  },
  content: { padding: tokens.space[4], gap: tokens.space[2] },
  chips: { flexDirection: 'row', gap: tokens.space[2], flexWrap: 'wrap' },
  chip: {
    backgroundColor: theme.wash,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[1],
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
  },
  buttons: {
    gap: tokens.space[2],
    marginTop: tokens.space[2],
    paddingTop: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.line,
  },
  button: {
    minHeight: 44,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space[3],
  },
  outline: { borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface },
}));

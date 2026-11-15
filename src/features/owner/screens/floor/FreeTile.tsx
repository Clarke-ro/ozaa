import { StyleSheet } from 'react-native';
import { PressableScale } from '@/ui/PressableScale';
import { useTranslation } from 'react-i18next';
import { STATUS_TONES } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';

/**
 * A free table as a short card (canvas): its name on top and "Free" in green at the bottom.
 * Nothing to do at a free table, so it is lower than the busy cards.
 */
export function FreeTile({
  code,
  label,
  selected,
  onPress,
}: {
  code: string;
  label?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const name = label ?? t('ownerFloor.tableName', { name: code });
  const free = t('owner.free');
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name}, ${free}`}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        cardStyle(theme),
        styles.tile,
        selected && { borderColor: theme.text },
        (pressed || hovered) && { backgroundColor: theme.wash },
      ]}
    >
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.free, { color: STATUS_TONES[theme.scheme].success.line }]}>{free}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 96,
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: tokens.owner.controls.cardPadding,
  },
  name: { fontSize: 17, lineHeight: 22, fontFamily: fontFamily.strong },
  free: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.strong },
});

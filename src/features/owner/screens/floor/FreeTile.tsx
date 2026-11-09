import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FLOOR_TONES } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

const DOT = tokens.space[2];

/**
 * A free table as a small chip: a green dot and the code. Nothing to do at a free table, so it
 * takes little room and the tables that need someone keep the space.
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
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label ?? t('ownerFloor.tableName', { name: code })}, ${t('owner.free')}`}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: pressed || hovered ? theme.wash : theme.surface,
          borderColor: selected ? theme.text : theme.line,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: FLOOR_TONES[theme.scheme].free.edge }]} />
      <Text variant="body-strong">{code}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
    minWidth: tokens.space[16] + tokens.space[4],
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
  },
  dot: { width: DOT, height: DOT, borderRadius: tokens.radius.full },
});

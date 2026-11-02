import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/**
 * Pinned to the bottom of a form while it has unsaved changes: Discard and Save.
 * Hidden when nothing changed, so a clean screen has no buttons competing for attention.
 */
export function SaveBar({
  visible,
  onSave,
  onDiscard,
  saving,
  label,
}: {
  visible: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saving?: boolean;
  label?: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  if (!visible && !saving) return null;
  return (
    <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOutDown.duration(120)}>
      <View style={[styles.bar, { backgroundColor: theme.surface, borderTopColor: theme.line }]}>
        <Text variant="caption" style={[styles.copy, { color: theme.muted }]}>
          {t('ownerKit.unsaved')}
        </Text>
        <Button
          label={t('ownerKit.discard')}
          tone="ghost"
          size="md"
          onPress={onDiscard}
          disabled={saving}
        />
        <Button label={label ?? t('ownerKit.save')} size="md" onPress={onSave} loading={saving} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  copy: { flex: 1 },
});

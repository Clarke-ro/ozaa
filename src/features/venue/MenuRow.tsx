import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ServiceIcon } from './ServiceIcon';

/** The Menu row at the top of "At your table": full width, bigger icon, and an arrow chip. */
export function MenuRow({
  id,
  subtitle,
  onPress,
}: {
  id: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const title = t(`services.${id}.title`);
  const body = subtitle ?? t(`services.${id}.body`);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={body}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: theme.line,
          backgroundColor: pressed ? theme.wash : theme.surface,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: theme.tint }]}>
        <ServiceIcon id={id} color={theme.ink} size={26} />
      </View>
      <View style={styles.copy}>
        <Text variant="title" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" numberOfLines={2} style={{ color: theme.muted }}>
          {body}
        </Text>
      </View>
      <View style={[styles.arrow, { backgroundColor: theme.tint }]}>
        <ArrowRight color={theme.ink} size={20} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    minHeight: 92,
    borderWidth: 1,
    borderRadius: tokens.radius.xl - 4,
    borderCurve: 'continuous',
    padding: tokens.space[4],
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

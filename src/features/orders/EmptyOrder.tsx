import { StyleSheet, View } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

const ICON = 64;

/** Nothing in the order yet: say so, and offer the menu. */
export function EmptyOrder({ onBrowse }: { onBrowse: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.icon, { backgroundColor: theme.tint }]}>
        <ShoppingBag size={28} color={theme.ink} strokeWidth={2} />
      </View>
      <Text variant="title" style={styles.center}>
        {t('basket.emptyTitle')}
      </Text>
      <Text variant="body" style={[styles.center, { color: theme.muted }]}>
        {t('basket.emptyBody')}
      </Text>
      <Button label={t('basket.browse')} onPress={onBrowse} style={styles.stretch} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space[8],
    gap: tokens.space[3],
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  stretch: { alignSelf: 'stretch', marginTop: tokens.space[2] },
});

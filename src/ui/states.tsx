import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Button } from './Button';
import { SafeScreen } from './Screen';
import { Text } from './Text';
import { useTheme } from './theme';

// Roughly a page title and three rows, so the page fills in rather than jumping into place.
const TITLE_HEIGHT = 28;
const ROW_HEIGHT = 72;
const ROWS = 3;

/** Grey blocks in the shape of a page while it loads. The owner app does the same. */
export function LoadingState() {
  const { t } = useTranslation();
  const theme = useTheme();
  const block = { backgroundColor: theme.wash, borderRadius: tokens.radius.md };
  return (
    <SafeScreen>
      <View
        style={styles.skeleton}
        accessibilityRole="progressbar"
        accessibilityLabel={t('errors.loading')}
      >
        <View style={[block, styles.title]} />
        {Array.from({ length: ROWS }, (_, i) => (
          <View key={i} style={[block, styles.row]} />
        ))}
      </View>
    </SafeScreen>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <SafeScreen>
      <View style={styles.box}>
        <Text variant="body" style={styles.copy}>
          {t('errors.generic')}
        </Text>
        <Button label={t('errors.tryAgain')} onPress={onRetry} tone="secondary" />
      </View>
    </SafeScreen>
  );
}

/** A venue whose owner hasn't published the menu yet. */
export function NotOpenState() {
  const { t } = useTranslation();
  return (
    <SafeScreen>
      <View style={styles.box}>
        <Text variant="title" accessibilityRole="header" style={styles.copy}>
          {t('notOpen.title')}
        </Text>
        <Text variant="body" style={styles.copy}>
          {t('notOpen.body')}
        </Text>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    padding: tokens.space[8],
    gap: tokens.space[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { textAlign: 'center' },
  skeleton: { flex: 1, padding: tokens.grid.mobile.margin, gap: tokens.space[3] },
  title: { height: TITLE_HEIGHT, width: '60%', marginBottom: tokens.space[2] },
  row: { height: ROW_HEIGHT },
});

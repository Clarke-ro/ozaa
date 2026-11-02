import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Button } from './Button';
import { SafeScreen } from './Screen';
import { Text } from './Text';
import { useTheme } from './theme';

export function LoadingState() {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <SafeScreen>
      <View style={styles.box} accessibilityLabel={t('errors.loading')}>
        <ActivityIndicator color={theme.ink} />
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

export function EmptyState({ message }: { message: string }) {
  return (
    <SafeScreen>
      <View style={styles.box}>
        <Text variant="body" style={styles.copy}>
          {message}
        </Text>
      </View>
    </SafeScreen>
  );
}

export function Skeleton({ height = 16 }: { height?: number }) {
  const theme = useTheme();
  return <View style={{ height, borderRadius: 8, backgroundColor: theme.wash }} />;
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: tokens.space[8], gap: tokens.space[4], alignItems: 'center', justifyContent: 'center' },
  copy: { textAlign: 'center' },
});

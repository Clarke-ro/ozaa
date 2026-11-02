import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export function OwnerPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardWrap}
    >
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.head}>
          <Text variant="display-m">{title}</Text>
          {subtitle ? (
            <Text variant="body" style={{ color: theme.meta }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function DeskWait({
  loading,
  error,
  onRetry,
  children,
}: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (loading) {
    return (
      <View style={styles.wait} accessibilityRole="progressbar" accessibilityLabel={t('errors.loading')}>
        <ActivityIndicator color={theme.ink} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.wait}>
        <Text variant="body">{t('errors.generic')}</Text>
        <Button label={t('errors.tryAgain')} onPress={onRetry} tone="secondary" />
      </View>
    );
  }
  return children;
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  page: {
    paddingHorizontal: tokens.grid.mobile.margin,
    paddingTop: tokens.space[5],
    paddingBottom: 128,
    gap: tokens.space[4],
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
  },
  head: { gap: tokens.space[2] },
  wait: { gap: tokens.space[3], paddingVertical: tokens.space[6] },
});

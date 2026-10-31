import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { OwnerPage } from '../chrome/OwnerPage';

export function ShellScreen({ title, body, next }: { title: string; body: string; next: string[] }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <OwnerPage title={title} subtitle={body}>
      <Text variant="caption" style={{ color: theme.meta }}>
        {t('owner.notYet')}
      </Text>
      <View style={styles.list}>
        {next.map((line) => (
          <Text key={line} variant="body">
            {line}
          </Text>
        ))}
      </View>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  list: { gap: tokens.space[3] },
});

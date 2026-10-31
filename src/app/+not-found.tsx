import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/ui/Button';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <SafeScreen>
    <View style={styles.page}>
      <Text variant="display-m">{t('notFound.title')}</Text>
      <Text variant="body" style={styles.body}>
        {t('notFound.body')}
      </Text>
      <Button label={t('notFound.action')} onPress={() => router.replace('/')} />
    </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', padding: 32, gap: 16 },
  body: { color: '#52525B' },
});

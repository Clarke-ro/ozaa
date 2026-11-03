import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { makeStyles } from '@/ui/makeStyles';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
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

const useStyles = makeStyles((theme) => ({
  page: {
    flex: 1,
    backgroundColor: theme.bg,
    justifyContent: 'center',
    padding: tokens.space[8],
    gap: tokens.space[4],
  },
  body: { color: theme.muted },
}));

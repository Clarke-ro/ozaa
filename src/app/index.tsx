import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function LandingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <SafeScreen>
      <View style={styles.page}>
        <Image
          source={require('../../assets/images/icon.png')}
          alt="Ozaa"
          style={styles.logo}
          accessibilityLabel="Ozaa"
        />
        <Text variant="display-l" style={styles.title}>
          {t('landing.title')}
        </Text>
        <Text variant="body" style={styles.body}>
          {t('landing.body')}
        </Text>
        <Button
          label={t('landing.sample')}
          onPress={() => router.push('/mamas-kitchen/t/12')}
          style={styles.button}
        />
        <Button
          label={t('landing.owner')}
          tone="secondary"
          onPress={() => router.push('/owner/login')}
          style={styles.owner}
        />
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space[8],
    gap: tokens.space[4],
  },
  logo: { width: 72, height: 72, marginBottom: 8 },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', color: '#52525B' },
  button: { alignSelf: 'stretch', marginTop: 12 },
  owner: { alignSelf: 'stretch' },
});

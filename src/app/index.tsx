import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DEMO } from '@/lib/demo';
import { env } from '@/lib/env';
import { DEMO_TABLE_PATH } from '@/mocks/demo';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { makeStyles } from '@/ui/makeStyles';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const demoSample = env.EXPO_PUBLIC_DEMO_URL
  ? `${env.EXPO_PUBLIC_DEMO_URL.replace(/\/+$/, '')}${DEMO_TABLE_PATH}`
  : null;

export default function LandingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  return (
    <SafeScreen>
      <View style={styles.page}>
        <Image
          source={require('../../assets/images/icon.png')}
          alt="Cravins"
          style={styles.logo}
          accessibilityLabel="Cravins"
        />
        <Text variant="display-l" style={styles.title}>
          {t('landing.title')}
        </Text>
        <Text variant="body" style={styles.body}>
          {t('landing.body')}
        </Text>
        {/* The sample venue lives in the demo build. A real build sends people there instead,
            so nobody orders at a real restaurant by accident. */}
        {DEMO ? (
          <Button
            label={t('landing.sample')}
            onPress={() => router.push(DEMO_TABLE_PATH)}
            style={styles.button}
          />
        ) : demoSample ? (
          <Button
            label={t('landing.sample')}
            onPress={() => void Linking.openURL(demoSample)}
            style={styles.button}
          />
        ) : null}
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

const LOGO_SIZE = 72;

const useStyles = makeStyles((theme) => ({
  page: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space[8],
    gap: tokens.space[4],
  },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE, marginBottom: tokens.space[2] },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', color: theme.muted },
  button: { alignSelf: 'stretch', marginTop: tokens.space[3] },
  owner: { alignSelf: 'stretch' },
}));

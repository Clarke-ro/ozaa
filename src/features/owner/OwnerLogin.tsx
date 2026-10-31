import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { parseGhanaPhone } from '@/lib/phone';
import { useOwnerSession } from '@/features/session';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { ozaaTheme, ThemeProvider } from '@/ui/theme';

export function OwnerLogin() {
  const { t } = useTranslation();
  const router = useRouter();
  const saveOwner = useOwnerSession((state) => state.saveOwner);
  const [phone, setPhone] = useState('0240000001');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  return (
    <ThemeProvider theme={ozaaTheme}>
      <View style={styles.page}>
        <Text variant="display-m">{t('owner.login')}</Text>
        <Text variant="caption">{t('owner.sample')}</Text>
        <TextInput accessibilityLabel={t('owner.phone')} value={phone} onChangeText={setPhone} style={styles.input} />
        {sent ? <TextInput accessibilityLabel={t('owner.code')} value={code} onChangeText={setCode} style={styles.input} /> : null}
        {error ? <Text>{t('errors.generic')}</Text> : null}
        <Button
          label={sent ? t('owner.enter') : t('owner.send')}
          onPress={() => {
            const parsed = parseGhanaPhone(phone);
            if (!parsed) return;
            setError(false);
            if (!sent) {
              void api.requestOtp({ phone: parsed.phone, purpose: 'owner_login' }).then(() => setSent(true));
              return;
            }
            void api
              .verifyOtp({ phone: parsed.phone, code, purpose: 'owner_login' })
              .then((tokens) => {
                const venue = tokens.user?.venues[0];
                if (!venue || !tokens.user) throw new Error('no venue');
                saveOwner({
                  accessToken: tokens.accessToken,
                  refreshToken: tokens.refreshToken,
                  venueId: venue.venueId,
                  role: venue.role,
                  firstName: tokens.user.firstName,
                });
                router.replace('/owner');
              })
              .catch(() => setError(true));
          }}
        />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff', padding: 24, gap: 12, justifyContent: 'center' },
  input: { borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 12, height: 48, paddingHorizontal: 12 },
});

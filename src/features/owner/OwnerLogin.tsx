import { makeStyles } from '@/ui/makeStyles';
import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { DEMO } from '@/lib/demo';
import { parseGhanaPhone } from '@/lib/phone';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { cravinsTheme, ThemeProvider, useTheme } from '@/ui/theme';
import { DeskCard, CravinsMark } from './kit';
import { SHADOW_INK } from '@/theme/palette';
import { SampleLogins, SAMPLES } from './SampleLogins';

// Demo builds only: sample staff from the mock, typed the way a Ghanaian number is (024…).

/** The sign-in page always uses the Cravins look, never a venue's colours. */
export function OwnerLogin() {
  return (
    <ThemeProvider theme={cravinsTheme}>
      <LoginForm />
    </ThemeProvider>
  );
}

// Its own component so useTheme and useStyles run inside the provider above. Called outside it,
// they read the outer theme, and in dark mode the text took dark colours on a light card.
function LoginForm() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useTranslation();
  const router = useRouter();
  const saveOwner = useOwnerSession((state) => state.saveOwner);
  const [phone, setPhone] = useState(DEMO ? (SAMPLES[0]?.local ?? '') : '');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur?.();
    }
  };

  const handleSubmit = () => {
    dismissKeyboard();
    const parsed = parseGhanaPhone(phone);
    if (!parsed) return;
    setError(false);
    setLoading(true);

    if (!sent) {
      void api
        .requestOtp({ phone: parsed.phone, purpose: 'owner_login' })
        .then(() => {
          setSent(true);
          setLoading(false);
        })
        .catch(() => {
          setError(true);
          setLoading(false);
        });
      return;
    }

    void api
      .verifyOtp({ phone: parsed.phone, code, purpose: 'owner_login' })
      .then((tokensRes) => {
        const venue = tokensRes.user?.venues[0];
        if (!venue || !tokensRes.user) throw new Error('no venue');
        saveOwner({
          accessToken: tokensRes.accessToken,
          refreshToken: tokensRes.refreshToken,
          venueId: venue.venueId,
          role: venue.role,
          firstName: tokensRes.user.firstName,
        });
        setLoading(false);
        router.replace(venue.role === 'kitchen' ? '/owner/orders' : '/owner');
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.touchableDismissArea} onPress={dismissKeyboard}>
            <DeskCard style={styles.authCard}>
              {/* Cravins brand lockup */}
              <View style={styles.brandLockup}>
                <CravinsMark size={44} />
                <Text variant="caption" style={styles.brandLabel}>
                  {t('owner.loginBrand')}
                </Text>
                <Text variant="display-m" style={styles.title}>
                  {t('owner.login')}
                </Text>
                <Text variant="body" style={styles.subtitle}>
                  {sent ? t('owner.codeLead') : t('owner.loginLead')}
                </Text>
              </View>

              {/* Phone input */}
              <View style={styles.formGroup}>
                <Text variant="caption" style={styles.inputLabel}>
                  {t('owner.phone')}
                </Text>
                <View style={styles.phoneInputWrapper}>
                  <View style={styles.phonePrefixBadge}>
                    <Text variant="body-strong" style={styles.prefixText}>
                      🇬🇭 +233
                    </Text>
                  </View>
                  <TextInput
                    accessibilityLabel={t('owner.phone')}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="024 123 4567"
                    placeholderTextColor={theme.meta}
                    keyboardType="phone-pad"
                    inputMode="tel"
                    returnKeyType={sent ? 'done' : 'next'}
                    onSubmitEditing={() => {
                      if (!sent) handleSubmit();
                      else dismissKeyboard();
                    }}
                    editable={!sent}
                    style={styles.phoneInput}
                  />
                </View>
              </View>

              {/* OTP Code input */}
              {sent ? (
                <View style={styles.formGroup}>
                  <View style={styles.codeHeaderRow}>
                    <Text variant="caption" style={styles.inputLabel}>
                      {t('owner.code')}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('owner.changeNumber')}
                      onPress={() => setSent(false)}
                    >
                      <Text variant="caption" style={{ color: theme.ink, fontWeight: '600' }}>
                        {t('owner.changeNumber')}
                      </Text>
                    </Pressable>
                  </View>
                  <TextInput
                    accessibilityLabel={t('owner.code')}
                    value={code}
                    onChangeText={setCode}
                    placeholder="123456"
                    placeholderTextColor={theme.meta}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    autoFocus
                    style={styles.codeInput}
                  />
                </View>
              ) : null}

              {error ? (
                <View style={styles.errorBox}>
                  <Text variant="caption" style={{ color: theme.error, fontWeight: '600' }}>
                    {t('errors.generic')}
                  </Text>
                </View>
              ) : null}

              {/* Submit button */}
              <Button
                label={sent ? t('owner.enter') : t('owner.send')}
                onPress={handleSubmit}
                loading={loading}
                disabled={!phone.trim() || (sent && !code.trim())}
              />

              {/* Sample logins: demo builds only, the accounts exist only in the mock. */}
              {!sent && DEMO ? (
                <SampleLogins
                  phone={phone}
                  onPick={(local) => {
                    dismissKeyboard();
                    setPhone(local);
                  }}
                />
              ) : null}
            </DeskCard>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const useStyles = makeStyles((theme) => ({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: theme.surface,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: tokens.space[4],
    paddingHorizontal: tokens.space[4],
  },
  touchableDismissArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authCard: {
    width: '100%',
    maxWidth: 440,
    gap: tokens.space[4],
    paddingVertical: tokens.space[5],
    paddingHorizontal: tokens.space[4],
    borderWidth: 1,
    borderColor: theme.line,
    shadowColor: SHADOW_INK,
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  brandLockup: {
    alignItems: 'center',
    gap: 6,
    textAlign: 'center',
  },
  brandLabel: {
    // The words are stored in sentence case so screen readers say them as words.
    textTransform: 'uppercase',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: theme.meta,
    marginTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: theme.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    fontWeight: '600',
    color: theme.muted,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: tokens.radius.md,
    backgroundColor: theme.surface,
    overflow: 'hidden',
    height: 48,
  },
  phonePrefixBadge: {
    backgroundColor: theme.wash,
    paddingHorizontal: tokens.space[3],
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: theme.line,
  },
  prefixText: {
    fontSize: 13,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: tokens.space[3],
    fontSize: 15,
    color: theme.text,
  },
  codeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeInput: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: tokens.radius.md,
    backgroundColor: theme.surface,
    height: 48,
    paddingHorizontal: tokens.space[3],
    fontSize: 20,
    letterSpacing: 4,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: theme.errorTint,
    padding: tokens.space[2],
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: theme.errorTint,
  },
}));

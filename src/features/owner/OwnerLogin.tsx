import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { parseGhanaPhone } from '@/lib/phone';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ozaaTheme, ThemeProvider } from '@/ui/theme';
import { DeskCard, OzaaMark } from './kit';

const SAMPLES = [
  { label: "Mama's Kitchen (Owner)", phone: '0240000001' },
  { label: 'Bean There (Manager)', phone: '0240000004' },
  { label: "Auntie Ako's (Waiter)", phone: '0240000005' },
];

export function OwnerLogin() {
  const { t } = useTranslation();
  const router = useRouter();
  const saveOwner = useOwnerSession((state) => state.saveOwner);
  const [phone, setPhone] = useState('0240000001');
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
    <ThemeProvider theme={ozaaTheme}>
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
                {/* Ozaa brand lockup */}
                <View style={styles.brandLockup}>
                  <OzaaMark size={44} />
                  <Text variant="caption" style={styles.brandLabel}>
                    OZAA RESTAURANT MANAGEMENT
                  </Text>
                  <Text variant="display-m" style={styles.title}>
                    {t('owner.login')}
                  </Text>
                  <Text variant="body" style={styles.subtitle}>
                    {sent
                      ? 'Enter the 6-digit verification code sent to your phone.'
                      : 'Sign in to access your orders dashboard, kitchen tickets, and floor status.'}
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
                      placeholderTextColor="#9CA3AF"
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
                        accessibilityLabel="Change phone"
                        onPress={() => setSent(false)}
                      >
                        <Text variant="caption" style={{ color: '#D24000', fontWeight: '600' }}>
                          Change number
                        </Text>
                      </Pressable>
                    </View>
                    <TextInput
                      accessibilityLabel={t('owner.code')}
                      value={code}
                      onChangeText={setCode}
                      placeholder="123456"
                      placeholderTextColor="#9CA3AF"
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
                    <Text variant="caption" style={{ color: '#DC2626', fontWeight: '600' }}>
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

                {/* Sample login helpers */}
                {!sent ? (
                  <View style={styles.sampleSection}>
                    <Text variant="caption" style={{ color: '#6B7280', textAlign: 'center' }}>
                      {t('owner.sample')}
                    </Text>
                    <View style={styles.sampleChips}>
                      {SAMPLES.map((s) => (
                        <Pressable
                          key={s.phone}
                          accessibilityRole="button"
                          accessibilityLabel={s.label}
                          onPress={() => {
                            dismissKeyboard();
                            setPhone(s.phone);
                          }}
                          style={[
                            styles.sampleChip,
                            {
                              borderColor: phone === s.phone ? '#111111' : '#E5E7EB',
                              backgroundColor: phone === s.phone ? '#F3F4F6' : '#FFFFFF',
                            },
                          ]}
                        >
                          <Text variant="caption" style={{ fontWeight: '600', color: '#374151' }}>
                            {s.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </DeskCard>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeScreen>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
    borderColor: '#E4E4E7',
    shadowColor: '#000',
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
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#888888',
    marginTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: tokens.radius.md,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    height: 48,
  },
  phonePrefixBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: tokens.space[3],
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  prefixText: {
    fontSize: 13,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: tokens.space[3],
    fontSize: 15,
    color: '#111111',
  },
  codeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: tokens.radius.md,
    backgroundColor: '#FFFFFF',
    height: 48,
    paddingHorizontal: tokens.space[3],
    fontSize: 20,
    letterSpacing: 4,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: tokens.space[2],
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  sampleSection: {
    gap: tokens.space[2],
    paddingTop: tokens.space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  sampleChips: {
    gap: 6,
  },
  sampleChip: {
    paddingVertical: 8,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
});

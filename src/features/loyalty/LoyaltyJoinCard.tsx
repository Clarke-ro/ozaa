import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { DEMO } from '@/lib/demo';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export function LoyaltyJoinCard({
  venueName,
  firstName,
  onFirstName,
  phone,
  onPhone,
  birthday,
  onBirthday,
  code,
  onCode,
  sent,
  loyaltyBox,
  onToggleLoyalty,
  marketing,
  onToggleMarketing,
  sending,
  verifying,
  errorMessage,
  onSendCode,
  onConfirm,
  onOpenSample,
}: {
  venueName: string;
  firstName: string;
  onFirstName: (value: string) => void;
  phone: string;
  onPhone: (value: string) => void;
  birthday: string;
  onBirthday: (value: string) => void;
  code: string;
  onCode: (value: string) => void;
  sent: boolean;
  loyaltyBox: boolean;
  onToggleLoyalty: () => void;
  marketing: boolean;
  onToggleMarketing: () => void;
  sending: boolean;
  verifying: boolean;
  errorMessage: string | null;
  onSendCode: () => void;
  onConfirm: () => void;
  onOpenSample: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={[styles.box, { borderColor: theme.line, backgroundColor: theme.surface }]}>
      <Text variant="display-m">{t('loyalty.join')}</Text>
      <Text variant="body" style={{ color: theme.muted }}>
        {t('loyalty.joinLead', { name: venueName })}
      </Text>
      <TextInput
        accessibilityLabel={t('loyalty.firstName')}
        value={firstName}
        onChangeText={onFirstName}
        placeholder={t('loyalty.firstName')}
        style={[styles.input, { borderColor: theme.line, backgroundColor: theme.surface }]}
      />
      <TextInput
        accessibilityLabel={t('loyalty.phone')}
        value={phone}
        onChangeText={onPhone}
        keyboardType="phone-pad"
        placeholder={t('loyalty.phone')}
        style={[styles.input, { borderColor: theme.line, backgroundColor: theme.surface }]}
      />
      <TextInput
        accessibilityLabel={t('loyalty.birthday')}
        value={birthday}
        onChangeText={onBirthday}
        placeholder={t('loyalty.birthday')}
        style={[styles.input, { borderColor: theme.line, backgroundColor: theme.surface }]}
      />
      {sent ? (
        <TextInput
          accessibilityLabel={t('loyalty.code')}
          value={code}
          onChangeText={onCode}
          keyboardType="number-pad"
          placeholder={t('loyalty.code')}
          style={[styles.input, { borderColor: theme.line, backgroundColor: theme.surface }]}
        />
      ) : null}

      <Pressable
        accessibilityRole="checkbox"
        aria-checked={loyaltyBox}
        onPress={onToggleLoyalty}
        style={styles.checkRow}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: loyaltyBox ? theme.fill : theme.line,
              backgroundColor: loyaltyBox ? theme.fill : theme.white,
            },
          ]}
        >
          {loyaltyBox ? <Check color={theme.onFill} size={14} strokeWidth={3} /> : null}
        </View>
        <Text variant="caption" style={{ flex: 1 }}>
          {t('loyalty.consent')}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="checkbox"
        aria-checked={marketing}
        onPress={onToggleMarketing}
        style={styles.checkRow}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: marketing ? theme.fill : theme.line,
              backgroundColor: marketing ? theme.fill : theme.white,
            },
          ]}
        >
          {marketing ? <Check color={theme.onFill} size={14} strokeWidth={3} /> : null}
        </View>
        <Text variant="caption" style={{ flex: 1 }}>
          {t('loyalty.marketing')}
        </Text>
      </Pressable>

      {errorMessage ? (
        <Text variant="caption" style={{ color: theme.error }}>
          {errorMessage}
        </Text>
      ) : null}

      {sent ? (
        <Button
          label={t('loyalty.confirm')}
          disabled={!loyaltyBox}
          loading={verifying}
          onPress={onConfirm}
        />
      ) : (
        <Button label={t('loyalty.sendCode')} loading={sending} onPress={onSendCode} />
      )}

      {/* Demo builds only: the sample member and code exist only in the mock. */}
      {DEMO ? (
        <View style={styles.sampleRow}>
          <Text variant="caption" style={{ color: theme.meta }}>
            {t('loyalty.sampleHint')}
          </Text>
          <Button label={t('loyalty.openSample')} tone="secondary" onPress={onOpenSample} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  input: { borderWidth: 1, borderRadius: 12, height: 48, paddingHorizontal: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleRow: { marginTop: 4, gap: 8 },
});

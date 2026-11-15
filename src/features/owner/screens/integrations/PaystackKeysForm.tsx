import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Field, Segmented } from '../../kit';

// Where owners find their keys in the Paystack dashboard (Settings → API Keys & Webhooks).
const PAYSTACK_KEYS_URL = 'https://dashboard.paystack.com/#/settings/developers';

/**
 * The Paystack key form (canvas): where to find the keys, Test or Live, the two keys, Connect.
 * The secret is only held in the parent until it is sent; this form never stores it.
 */
export function PaystackKeysForm({
  mode,
  onMode,
  publicKey,
  onPublicKey,
  secretKey,
  onSecretKey,
  error,
  connecting,
  onConnect,
}: {
  mode: 'test' | 'live';
  onMode: (mode: 'test' | 'live') => void;
  publicKey: string;
  onPublicKey: (text: string) => void;
  secretKey: string;
  onSecretKey: (text: string) => void;
  error?: string;
  connecting: boolean;
  onConnect: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.stack}>
      {/* Canvas: where the keys are, in one grey box with a link to Paystack. */}
      <View style={[styles.where, { backgroundColor: theme.wash }]}>
        <Text style={[styles.whereText, { color: theme.muted }]}>{t('ownerPay.whereShort')}</Text>
        <Button
          label={t('ownerPay.openPaystack')}
          tone="secondary"
          onPress={() => void Linking.openURL(PAYSTACK_KEYS_URL)}
          style={styles.small}
        />
      </View>
      <View style={styles.mode}>
        <Text style={[styles.label, { color: theme.muted }]}>{t('ownerPay.mode')}</Text>
        <View style={styles.modeSwitch}>
          <Segmented
            label={t('ownerPay.mode')}
            value={mode}
            onChange={onMode}
            options={[
              { id: 'test', label: t('ownerPay.testMode') },
              { id: 'live', label: t('ownerPay.liveMode') },
            ]}
          />
        </View>
        <Text variant="caption" style={{ color: theme.meta }}>
          {mode === 'test' ? t('ownerPay.testHint') : t('ownerPay.liveOff')}
        </Text>
      </View>
      <View style={styles.keys}>
        <View style={styles.key}>
          <Field
            label={t('ownerPay.publicKey')}
            value={publicKey}
            onChangeText={onPublicKey}
            placeholder={mode === 'test' ? 'pk_test_…' : 'pk_live_…'}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View style={styles.key}>
          <Field
            label={t('ownerPay.secretKey')}
            value={secretKey}
            onChangeText={onSecretKey}
            placeholder={mode === 'test' ? 'sk_test_…' : 'sk_live_…'}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            secureTextEntry
            error={error}
          />
        </View>
      </View>
      <View style={[styles.foot, { borderTopColor: theme.wash }]}>
        <Text style={[styles.footNote, { color: theme.meta }]}>{t('ownerPay.secretNote')}</Text>
        <Button label={t('ownerPay.connect')} loading={connecting} onPress={onConnect} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[5] },
  where: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: 14,
    paddingHorizontal: tokens.space[4],
    borderRadius: 14,
  },
  whereText: { flexGrow: 1, flexBasis: 260, fontSize: 14, lineHeight: 20 },
  small: { minHeight: 40 },
  mode: { gap: tokens.space[2] },
  modeSwitch: { maxWidth: 320 },
  label: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_600' },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[4] },
  key: { flexGrow: 1, flexBasis: 240, minWidth: 0 },
  foot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: tokens.space[3],
    paddingTop: tokens.space[4],
    borderTopWidth: 1,
  },
  footNote: { flexGrow: 1, flexBasis: 240, fontSize: 13, lineHeight: 18 },
});

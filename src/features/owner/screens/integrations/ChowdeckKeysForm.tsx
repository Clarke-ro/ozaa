import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Field } from '../../kit';

// Where owners find their keys in the Chowdeck vendor dashboard (Settings → Developers).
const CHOWDECK_KEYS_URL = 'https://dashboard.chowdeck.com/settings/developers';

/**
 * The three Chowdeck keys and Connect. Test keys only, like Paystack (AGENTS.md rule 5). The
 * secrets live only in this form until they are sent; the server stores them sealed.
 */
export function ChowdeckKeysForm({
  connecting,
  onConnect,
}: {
  connecting: boolean;
  onConnect: (keys: {
    merchantReference: string;
    secretKey: string;
    webhookSecret: string;
  }) => void;
}) {
  const { t } = useTranslation();
  const [merchantReference, setReference] = useState('');
  const [secretKey, setSecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [tried, setTried] = useState(false);
  const reference = merchantReference.trim();
  const ok =
    /^[A-Za-z0-9_-]{1,64}$/.test(reference) &&
    secretKey.trim().length >= 10 &&
    webhookSecret.trim().length >= 10;
  const missing = (value: string, min: number) =>
    tried && value.trim().length < min ? t('ownerChannels.err.key') : undefined;

  return (
    <View style={styles.stack}>
      <Field
        label={t('ownerChannels.reference')}
        value={merchantReference}
        onChangeText={setReference}
        autoCapitalize="none"
        autoCorrect={false}
        error={
          tried && !/^[A-Za-z0-9_-]{1,64}$/.test(reference)
            ? t('ownerChannels.err.reference')
            : undefined
        }
      />
      <Field
        label={t('ownerChannels.secretKey')}
        value={secretKey}
        onChangeText={setSecret}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        secureTextEntry
        error={missing(secretKey, 10)}
      />
      <Field
        label={t('ownerChannels.webhookSecret')}
        value={webhookSecret}
        onChangeText={setWebhookSecret}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        secureTextEntry
        error={missing(webhookSecret, 10)}
      />
      <View style={styles.actions}>
        <Button
          label={t('ownerChannels.openChowdeck')}
          tone="secondary"
          size="md"
          onPress={() => void Linking.openURL(CHOWDECK_KEYS_URL)}
        />
        <Button
          label={t('ownerChannels.connect')}
          size="md"
          loading={connecting}
          onPress={() =>
            ok
              ? onConnect({
                  merchantReference: reference,
                  secretKey: secretKey.trim(),
                  webhookSecret: webhookSecret.trim(),
                })
              : setTried(true)
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
});

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CircleCheck, Nfc } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ModalSheet, toast } from '../../kit';
import { canWriteNfc, nfcWriter, writeNfcTag, type NfcResult } from './nfc';
import { shareLink } from './qrActions';

type Step = 'ready' | 'waiting' | NfcResult;

/**
 * Write one table's link to an NFC tag. On Chrome for Android it waits for a tag held to the
 * back of the phone; anywhere else it shows the link to copy into an NFC app.
 */
export function NfcTagSheet({
  table,
  url,
  onClose,
}: {
  table: string | null;
  url: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('ready');
  const stop = useRef<AbortController | null>(null);
  const supported = canWriteNfc();
  const open = table !== null;

  // Chrome asks for NFC permission only after a tap, so writing starts from the button.
  const write = async () => {
    const controller = new AbortController();
    stop.current = controller;
    setStep('waiting');
    const result = await writeNfcTag(url, { Reader: nfcWriter(window), signal: controller.signal });
    if (!controller.signal.aborted) setStep(result);
  };
  // Closing the sheet stops Chrome waiting for a tag.
  const close = () => {
    stop.current?.abort();
    setStep('ready');
    onClose();
  };
  useEffect(() => () => stop.current?.abort(), []);

  const copy = async () => {
    const result = await shareLink(url, table ?? '');
    if (result === 'copied') toast.success(t('ownerTables.nfc.copied'));
  };

  const done = step === 'written';
  const body = !supported
    ? t('ownerTables.nfc.otherPhone')
    : done
      ? t('ownerTables.nfc.written')
      : step === 'ready'
        ? t('ownerTables.nfc.hold')
        : t(`ownerTables.nfc.${step}`);

  return (
    <ModalSheet
      visible={open}
      onClose={close}
      title={t('ownerTables.nfc.title', { name: table ?? '' })}
      maxWidth={440}
    >
      <View style={styles.hero}>
        {done ? (
          <CircleCheck size={48} color={theme.success} />
        ) : (
          <Nfc size={48} color={theme.text} />
        )}
        <Text
          variant="body"
          accessibilityLiveRegion="polite"
          style={[styles.center, { color: theme.muted }]}
        >
          {body}
        </Text>
      </View>
      {supported ? null : (
        <Text variant="caption" selectable style={[styles.center, { color: theme.text }]}>
          {url}
        </Text>
      )}
      {!supported ? (
        <Button label={t('ownerTables.nfc.copyLink')} onPress={() => void copy()} />
      ) : done ? (
        <Button label={t('ownerTables.nfc.done')} onPress={close} />
      ) : step === 'waiting' ? (
        <Button label={t('ownerTables.nfc.cancel')} tone="secondary" onPress={close} />
      ) : (
        <Button
          label={t(step === 'ready' ? 'ownerTables.nfc.start' : 'ownerTables.nfc.again')}
          onPress={() => void write()}
        />
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: tokens.space[3], paddingVertical: tokens.space[4] },
  center: { textAlign: 'center' },
});

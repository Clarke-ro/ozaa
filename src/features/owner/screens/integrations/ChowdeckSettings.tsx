import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import type { Channel, Menu } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Chips, Field, Segmented, toast } from '../../kit';
import { FormLabel } from '../menu/FormLabel';
import { priceRuleFrom } from './chowdeck';

const STEPS = ['10', '50', '100'] as const;

/**
 * A connected Chowdeck: the webhook address to paste into Chowdeck, the price rule, dishes to
 * leave off, Save and Publish, then any dishes the last send couldn't take. Labels above
 * controls, no helper lines (design/brand.md section 8).
 */
export function ChowdeckSettings({
  channel,
  menu,
  currency,
  saving,
  publishing,
  onSave,
  onPublish,
  onDisconnect,
}: {
  channel: Channel;
  menu: Menu | null;
  currency: string;
  saving: boolean;
  publishing: boolean;
  onSave: (patch: { priceRule: Channel['priceRule']; hiddenItemIds: string[] }) => void;
  onPublish: () => void;
  onDisconnect: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [percent, setPercent] = useState(String(channel.priceRule.percent || ''));
  const [step, setStep] = useState<(typeof STEPS)[number]>(
    String(channel.priceRule.roundToPesewas) as (typeof STEPS)[number],
  );
  const [hidden, setHidden] = useState<string[]>(channel.hiddenItemIds);
  const rule = priceRuleFrom(percent, Number(step));
  const dishes = (menu?.items ?? []).filter((item) => !item.hidden);
  const changed =
    rule !== null &&
    (rule.percent !== channel.priceRule.percent ||
      rule.roundToPesewas !== channel.priceRule.roundToPesewas ||
      hidden.join() !== channel.hiddenItemIds.join());
  const webhook = channel.chowdeck?.webhookUrl ?? '';

  const copy = async () => {
    const ok = await Clipboard.setStringAsync(webhook);
    if (ok) toast.success(t('ownerChannels.copied'));
  };

  return (
    <View style={styles.stack}>
      <View style={styles.block}>
        <FormLabel>{t('ownerChannels.webhook')}</FormLabel>
        <View style={styles.row}>
          <Text selectable numberOfLines={1} style={[styles.url, { color: theme.text }]}>
            {webhook}
          </Text>
          <Button
            label={t('ownerChannels.copy')}
            tone="secondary"
            size="md"
            onPress={() => void copy()}
          />
        </View>
      </View>

      <View style={styles.pair}>
        <View style={styles.half}>
          <Field
            label={t('ownerChannels.percent')}
            value={percent}
            onChangeText={setPercent}
            placeholder="0"
            keyboardType="number-pad"
            error={rule === null ? t('ownerChannels.err.percent') : undefined}
          />
        </View>
        <View style={[styles.half, styles.block]}>
          <FormLabel>{t('ownerChannels.round')}</FormLabel>
          <Segmented
            label={t('ownerChannels.round')}
            value={step}
            onChange={setStep}
            options={STEPS.map((id) => ({ id, label: formatMoney(pesewas(Number(id)), currency) }))}
          />
        </View>
      </View>

      {dishes.length > 0 ? (
        <View style={styles.block}>
          <FormLabel>{t('ownerChannels.leaveOff')}</FormLabel>
          <Chips
            label={t('ownerChannels.leaveOff')}
            options={dishes.map((d) => ({ id: d.id, label: d.name.en }))}
            selected={hidden}
            onChange={setHidden}
          />
        </View>
      ) : null}

      {channel.sync.problems.length > 0 ? (
        <View style={styles.block}>
          <FormLabel>{t('ownerChannels.problems')}</FormLabel>
          {channel.sync.problems.map((problem) => (
            <Text
              key={`${problem.code}-${problem.itemId ?? ''}`}
              variant="caption"
              style={{ color: theme.error }}
            >
              {problem.message}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={t('ownerChannels.disconnect')}
          tone="ghost"
          size="md"
          onPress={onDisconnect}
        />
        <View style={styles.spacer} />
        <Button
          label={t('ownerKit.save')}
          tone="secondary"
          size="md"
          loading={saving}
          disabled={!changed}
          onPress={() => rule && onSave({ priceRule: rule, hiddenItemIds: hidden })}
        />
        <Button
          label={t('ownerChannels.publish')}
          size="md"
          loading={publishing}
          disabled={!channel.enabled || changed}
          onPress={onPublish}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[5] },
  block: { gap: tokens.space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  url: { flex: 1, minWidth: 0, fontSize: 14 },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[4] },
  half: { flexGrow: 1, flexBasis: 200, minWidth: 0 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.space[2] },
  spacer: { flexGrow: 1 },
});

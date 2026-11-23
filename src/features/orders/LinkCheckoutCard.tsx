import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react-native';
import type { OnlineOrdering } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { hereOnce } from '@/lib/here';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { FilterChips } from '@/ui/FilterChips';
import { Text } from '@/ui/Text';
import { guestFont, useTheme } from '@/ui/theme';
import type { CheckoutCheck, CheckoutDraft } from './linkCheckout';

/**
 * For guests who came from the menu link, not a table: pickup or delivery, who the order is for,
 * and where to bring it. Nothing here is saved on the phone; it goes with the order only.
 */
export function LinkCheckoutCard({
  settings,
  draft,
  onDraft,
  check,
  showErrors,
  currency,
}: {
  settings: OnlineOrdering;
  draft: CheckoutDraft;
  onDraft: (draft: CheckoutDraft) => void;
  check: CheckoutCheck;
  showErrors: boolean;
  currency: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<'denied' | 'unavailable' | null>(null);
  const both = settings.pickup.enabled && settings.delivery.enabled;
  const failed = !check.ok ? check.field : null;
  const error = (field: string) =>
    showErrors && failed === field ? t(`linkOrder.err.${field}`) : null;
  const set = (changes: Partial<CheckoutDraft>) => onDraft({ ...draft, ...changes });

  const locate = async () => {
    setLocating(true);
    setLocateError(null);
    const here = await hereOnce();
    setLocating(false);
    if (here.ok) set({ location: here.point });
    else setLocateError(here.reason);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <Text variant="title" accessibilityRole="header">
        {t('linkOrder.title')}
      </Text>
      {both ? (
        <FilterChips<CheckoutDraft['type']>
          label={t('linkOrder.how')}
          value={draft.type}
          onChange={(type) => set({ type })}
          items={[
            { id: 'pickup', label: t('linkOrder.pickup') },
            { id: 'delivery', label: t('linkOrder.delivery') },
          ]}
        />
      ) : (
        <Text variant="body-strong">
          {draft.type === 'pickup' ? t('linkOrder.pickupOnly') : t('linkOrder.deliveryOnly')}
        </Text>
      )}
      {draft.type === 'pickup' ? (
        <Text variant="caption" style={{ color: theme.muted }}>
          {t('linkOrder.pickupHint', { minutes: settings.pickup.prepMinutes })}
        </Text>
      ) : null}

      <Input
        label={t('linkOrder.name')}
        value={draft.name}
        onChange={(name) => set({ name })}
        error={error('name')}
        autoComplete="name"
      />
      <Input
        label={t('linkOrder.phone')}
        value={draft.phone}
        onChange={(phone) => set({ phone })}
        error={error('phone')}
        autoComplete="tel"
        keyboardType="phone-pad"
        placeholder="024 123 4567"
      />

      {draft.type === 'delivery' ? (
        <>
          <Input
            label={t('linkOrder.address')}
            value={draft.address}
            onChange={(address) => set({ address })}
            error={error('address')}
            autoComplete="street-address"
            placeholder={t('linkOrder.addressHint')}
            multiline
          />
          <Button
            label={draft.location ? t('linkOrder.locationAgain') : t('linkOrder.useLocation')}
            tone="secondary"
            loading={locating}
            onPress={() => void locate()}
          />
          {draft.location ? (
            <View style={styles.row}>
              <MapPin size={16} color={theme.success} />
              <Text variant="caption" style={{ color: theme.success }}>
                {t('linkOrder.locationSet')}
              </Text>
            </View>
          ) : null}
          {locateError ? (
            <Text variant="caption" accessibilityRole="alert" style={{ color: theme.error }}>
              {t(`linkOrder.locate.${locateError}`)}
            </Text>
          ) : (
            error('location') && (
              <Text variant="caption" accessibilityRole="alert" style={{ color: theme.error }}>
                {error('location')}
              </Text>
            )
          )}
          {failed === 'too_far' ? (
            <Text variant="caption" accessibilityRole="alert" style={{ color: theme.error }}>
              {t('linkOrder.err.too_far', { km: settings.delivery.maxDistanceKm })}
            </Text>
          ) : null}
          {check.ok ? (
            <Text variant="caption" style={{ color: theme.muted }}>
              {check.deliveryFeePesewas === 0
                ? t('linkOrder.feeFree')
                : t('linkOrder.fee', {
                    fee: formatMoney(pesewas(check.deliveryFeePesewas), currency),
                  })}
            </Text>
          ) : null}
        </>
      ) : null}

      <Text variant="caption" style={{ color: theme.meta }}>
        {t('linkOrder.why')}
      </Text>
    </View>
  );
}

function Input({
  label,
  value,
  onChange,
  error,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  error: string | null;
} & Pick<
  React.ComponentProps<typeof TextInput>,
  'autoComplete' | 'keyboardType' | 'placeholder' | 'multiline'
>) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text variant="body-strong">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={theme.meta}
        style={[
          styles.input,
          { color: theme.text, borderColor: error ? theme.error : theme.line },
          rest.multiline && styles.multi,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" accessibilityRole="alert" style={{ color: theme.error }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: tokens.space[4],
    gap: tokens.space[3],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  field: { gap: tokens.space[1] },
  input: {
    minHeight: tokens.touchTarget,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[3],
    fontFamily: guestFont.regular,
    fontSize: 16,
  },
  multi: { minHeight: 72, paddingTop: tokens.space[2], textAlignVertical: 'top' },
});

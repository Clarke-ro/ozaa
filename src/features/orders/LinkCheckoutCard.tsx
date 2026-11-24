import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MapPin, ShieldCheck } from 'lucide-react-native';
import type { OnlineOrdering } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { hereOnce } from '@/lib/here';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { guestFont, useTheme } from '@/ui/theme';
import type { CheckoutCheck, CheckoutDraft } from './linkCheckout';

/**
 * For guests who came from the menu link, not a table: pickup or delivery, who the order is for,
 * and where to bring it, as the design canvas draws it (Clarke, 2026-11-23): a segmented control,
 * then each field as a white box under its label, with no section titles. Nothing here is saved
 * on the phone; it goes with the order only.
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
    <View style={styles.wrap}>
      {both ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('linkOrder.how')}
          style={[styles.track, { backgroundColor: theme.track }]}
        >
          {(['pickup', 'delivery'] as const).map((type) => {
            const on = draft.type === type;
            return (
              <Pressable
                key={type}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                aria-checked={on}
                onPress={() => set({ type })}
                style={[styles.segment, on && [styles.segmentOn, { backgroundColor: theme.white }]]}
              >
                <Text variant="body-strong" style={{ color: on ? theme.text : theme.muted }}>
                  {t(`linkOrder.${type}`)}
                </Text>
                {type === 'pickup' ? (
                  <Text variant="caption" style={[styles.segmentSub, { color: theme.muted }]}>
                    {t('online.pickupIn', { minutes: settings.pickup.prepMinutes })}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
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

      <View style={[styles.note, { backgroundColor: theme.wash }]}>
        <ShieldCheck size={18} color={theme.muted} strokeWidth={2} />
        <Text variant="caption" style={[styles.noteText, { color: theme.muted }]}>
          {t('linkOrder.why')}
        </Text>
      </View>
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
      <Text variant="body-strong" style={styles.label}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={theme.meta}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.white,
            borderColor: error ? theme.error : 'transparent',
          },
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
  wrap: { gap: tokens.space[4] },
  track: { flexDirection: 'row', padding: 4, borderRadius: tokens.radius.md, gap: 4 },
  segment: {
    flex: 1,
    minHeight: 56,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: { boxShadow: '0 1px 3px rgba(17, 17, 17, 0.12)' },
  segmentSub: { fontSize: 12, lineHeight: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  field: { gap: tokens.space[2] },
  label: { paddingStart: 4 },
  input: {
    minHeight: 54,
    borderWidth: 1.5,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: tokens.space[4],
    fontFamily: guestFont.regular,
    fontSize: 16,
    boxShadow: tokens.shadow.card,
  },
  multi: { minHeight: 80, paddingTop: tokens.space[3], textAlignVertical: 'top' },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space[2] + 2,
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
  },
  noteText: { flex: 1 },
});

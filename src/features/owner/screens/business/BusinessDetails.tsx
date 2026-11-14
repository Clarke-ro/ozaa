import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { Business, BusinessCategory, BusinessPatch } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Button } from '@/ui/Button';
import { useDraft } from '../../data/useDraft';
import { ownerKeys } from '../../data/keys';
import { Chips, Field, Segmented, SectionLabel, toast } from '../../kit';
import { CategoryPicker } from './CategoryPicker';

const CATEGORIES: readonly BusinessCategory[] = [
  'restaurant',
  'chop_bar',
  'cafe',
  'bar',
  'lounge',
  'fast_food',
  'bakery',
  'catering',
];
// The canvas cuisine chips. Saved as plain words, so a cuisine typed elsewhere still shows.
const CUISINES = [
  'Ghanaian',
  'West African',
  'Continental',
  'Grills',
  'Seafood',
  'Vegetarian',
  'Breakfast',
];
// Ghana Revenue Authority TINs are a letter and ten digits, like C0012345678.
const TIN = /^[A-Z]\d{10}$/;

/** The business itself: what it is, how to reach it, and its tax and registration numbers. */
export function BusinessDetails({ business, tax }: { business: Business; tax?: ReactNode }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const draft = useDraft({
    name: business.name,
    description: business.description ?? '',
    categories: (business.categories ?? []) as BusinessCategory[],
    cuisines: business.cuisines ?? [],
    priceRange: String(business.priceRange ?? ''),
    yearOpened: business.yearOpened ? String(business.yearOpened) : '',
    website: business.website ?? '',
    phone: business.phone ?? '',
    email: business.email ?? '',
    tin: business.tin ?? '',
    registrationNumber: business.registrationNumber ?? '',
  });
  const f = draft.value;
  const tinBad = f.tin.trim() !== '' && !TIN.test(f.tin.trim().toUpperCase());
  const save = useMutation({
    mutationFn: (body: BusinessPatch) => api.ownerUpdateBusiness(body),
    onSuccess: () => {
      toast.success(t('ownerKit.saved'));
      draft.reset();
      void client.invalidateQueries({ queryKey: ownerKeys.business() });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  const submit = () => {
    if (f.name.trim().length < 2) return toast.error(t('ownerBusiness.needName'));
    if (tinBad) return toast.error(t('ownerBusiness.tinError'));
    const year = Number.parseInt(f.yearOpened, 10);
    save.mutate({
      name: f.name.trim(),
      description: f.description.trim() || null,
      categories: f.categories,
      cuisines: f.cuisines,
      priceRange: f.priceRange ? Number(f.priceRange) : null,
      yearOpened: Number.isFinite(year) ? year : null,
      website: f.website.trim() || null,
      phone: f.phone.trim() || null,
      email: f.email.trim() || null,
      tin: f.tin.trim().toUpperCase() || null,
      registrationNumber: f.registrationNumber.trim() || null,
    });
  };

  return (
    <View style={styles.stack}>
      <SectionLabel title={t('ownerBusiness.business')} />
      <Field
        label={t('owner.businessName')}
        value={f.name}
        onChangeText={(v) => draft.set('name', v)}
      />
      <Field
        label={t('ownerBusiness.description')}
        hint={t('ownerBusiness.descriptionHint')}
        multiline
        value={f.description}
        onChangeText={(v) => draft.set('description', v)}
      />
      <View style={styles.block}>
        <Label>{t('ownerBusiness.category')}</Label>
        <CategoryPicker
          all={CATEGORIES}
          selected={f.categories}
          onChange={(v) => draft.set('categories', v)}
        />
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('ownerBusiness.categoryHint')}
        </Text>
      </View>
      <View style={styles.block}>
        <Label>{t('ownerBusiness.cuisines')}</Label>
        <Chips<string>
          filled
          label={t('ownerBusiness.cuisines')}
          selected={f.cuisines}
          onChange={(v) => draft.set('cuisines', v)}
          options={[...new Set([...CUISINES, ...f.cuisines])].map((id) => ({ id, label: id }))}
        />
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('ownerBusiness.cuisinesPick')}
        </Text>
      </View>
      <View style={[styles.block, styles.price]}>
        <Label>{t('ownerBusiness.priceRange')}</Label>
        {/* No "not set" choice: a business that never picked one simply has none highlighted. */}
        <Segmented
          label={t('ownerBusiness.priceRange')}
          value={f.priceRange}
          onChange={(v) => draft.set('priceRange', v)}
          options={['1', '2', '3', '4'].map((id) => ({ id, label: '₵'.repeat(Number(id)) }))}
        />
        {f.priceRange ? (
          <Text variant="caption" style={{ color: theme.meta }}>
            {t(`ownerBusiness.spend.${f.priceRange}`)}
          </Text>
        ) : null}
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label={t('ownerBusiness.yearOpened')}
            keyboardType="number-pad"
            value={f.yearOpened}
            onChangeText={(v) => draft.set('yearOpened', v)}
          />
        </View>
        <View style={styles.half}>
          <Field
            label={t('ownerBusiness.website')}
            autoCapitalize="none"
            value={f.website}
            onChangeText={(v) => draft.set('website', v)}
          />
        </View>
      </View>
      <SectionLabel title={t('ownerBusiness.contactTax')} />
      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label={t('ownerBusiness.phone')}
            keyboardType="phone-pad"
            value={f.phone}
            onChangeText={(v) => draft.set('phone', v)}
          />
        </View>
        <View style={styles.half}>
          <Field
            label={t('ownerBusiness.email')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={f.email}
            onChangeText={(v) => draft.set('email', v)}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label={t('ownerBusiness.tin')}
            hint={t('ownerBusiness.tinHint')}
            autoCapitalize="characters"
            value={f.tin}
            onChangeText={(v) => draft.set('tin', v)}
            error={tinBad ? t('ownerBusiness.tinError') : undefined}
          />
        </View>
        <View style={styles.half}>
          <Field
            label={t('ownerBusiness.registration')}
            hint={t('ownerBusiness.registrationHint')}
            value={f.registrationNumber}
            onChangeText={(v) => draft.set('registrationNumber', v)}
          />
        </View>
      </View>
      {tax}
      {draft.dirty ? (
        <View style={styles.end}>
          <Button
            label={t('ownerBusiness.saveDetails')}
            size="md"
            loading={save.isPending}
            onPress={submit}
          />
        </View>
      ) : null}
    </View>
  );
}

function Label({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text variant="body-strong" style={{ fontSize: 14, lineHeight: 20, color: theme.muted }}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  block: { gap: tokens.space[2] },
  price: { maxWidth: 320 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  // Canvas: each pair splits the width evenly, so every field in a row is the same length.
  half: { flexGrow: 1, flexShrink: 1, flexBasis: 240, minWidth: 0 },
  end: { alignItems: 'flex-end' },
});

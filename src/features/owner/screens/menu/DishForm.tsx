import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MenuCategory, MenuItem } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Chips, Field, PhotoField, SwitchRow, TitledSection } from '../../kit';
import { AddOnsEditor } from './AddOnsEditor';
import { DishStockFields } from './DishStockFields';
import { DishTags } from './DishTags';
import { useDishForm } from './useDishForm';

type Form = ReturnType<typeof useDishForm>;

/**
 * The dish form in the canvas order: photo, details, extras, what shows on the menu, then the
 * parts the canvas has no room for (pricing and stock, diet). `children` draws the buttons.
 */
export function DishForm({
  item,
  sections,
  defaultSectionId,
  venueId,
  currency,
  onDone,
  children,
}: {
  item: MenuItem | null;
  sections: MenuCategory[];
  defaultSectionId: string;
  venueId: string;
  currency: string;
  onDone: () => void;
  children: (form: Form) => ReactNode;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const form = useDishForm({ item, venueId, defaultSectionId, onSaved: onDone });
  const { fields: f, set, error } = form;
  return (
    <View style={styles.stack}>
      <TitledSection title={t('ownerMenu.photo')} cardStyle={styles.pad}>
        <PhotoField
          venueId={venueId}
          url={f.photoUrl}
          label={t('ownerMenu.photo')}
          onChange={set.photo}
        />
      </TitledSection>

      <TitledSection title={t('ownerMenu.details')} cardStyle={styles.pad}>
        <View style={styles.row}>
          <View style={styles.wide}>
            <Field
              label={t('ownerMenu.dishName')}
              value={f.name}
              onChangeText={set.name}
              placeholder={t('ownerMenu.dishNameHint')}
              error={error('name')}
              autoCapitalize="sentences"
            />
          </View>
          <View style={styles.narrow}>
            <Field
              label={t('ownerMenu.price', { currency })}
              value={f.price}
              onChangeText={set.price}
              placeholder="65.00"
              keyboardType="decimal-pad"
              error={error('price')}
            />
          </View>
        </View>
        <Field
          label={t('ownerMenu.description')}
          value={f.description}
          onChangeText={set.description}
          placeholder={t('ownerMenu.descriptionHint')}
          multiline
        />
        <View style={styles.block}>
          <Text variant="body-strong" style={[styles.label, { color: theme.muted }]}>
            {t('ownerMenu.section')}
          </Text>
          <Chips
            single
            label={t('ownerMenu.section')}
            options={sections.map((s) => ({ id: s.id, label: s.name.en }))}
            selected={[f.sectionId]}
            onChange={(ids) => set.sectionId(ids[0] ?? '')}
          />
          {error('section') ? (
            <Text variant="caption" style={{ color: theme.error }}>
              {error('section')}
            </Text>
          ) : null}
        </View>
      </TitledSection>

      <TitledSection title={t('ownerMenu.extras')} cardStyle={styles.pad}>
        <Text variant="caption" style={{ color: error('addOns') ? theme.error : theme.muted }}>
          {error('addOns') ?? t('ownerMenu.addOnsNote')}
        </Text>
        <AddOnsEditor groups={f.groups} onChange={set.groups} />
      </TitledSection>

      <TitledSection title={t('ownerMenu.showTitle')} cardStyle={styles.bare}>
        {/* Popular puts a tag on the dish for guests; the guest menu can sort by it. */}
        <SwitchRow
          label={t('ownerMenu.popular')}
          hint={t('ownerMenu.popularHint')}
          value={f.badges.includes('popular')}
          onChange={set.togglePopular}
        />
      </TitledSection>

      <TitledSection title={t('ownerMenu.pricingStock')} cardStyle={styles.pad}>
        <DishStockFields
          status={f.status}
          onStatus={set.status}
          draft={f.stockDraft}
          onDraft={set.stockDraft}
          currency={currency}
          error={error}
        />
        <Field
          label={t('ownerMenu.calories')}
          value={f.calories}
          onChangeText={set.calories}
          placeholder="520"
          keyboardType="number-pad"
        />
      </TitledSection>

      <DishTags
        dietary={f.dietary}
        dietaryCustom={f.dietaryCustom}
        allergens={f.allergens}
        onDietary={set.dietary}
        onDietaryCustom={set.dietaryCustom}
        onAllergens={set.allergens}
      />

      {children(form)}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.owner.controls.sectionGap },
  pad: { padding: tokens.owner.controls.cardPadding, gap: tokens.space[4] },
  bare: { padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[4] },
  wide: { flexGrow: 2, flexBasis: 240, minWidth: 0 },
  narrow: { flexGrow: 1, flexBasis: 140, minWidth: 0 },
  block: { gap: tokens.space[2] },
  label: { fontSize: 14, lineHeight: 20 },
});

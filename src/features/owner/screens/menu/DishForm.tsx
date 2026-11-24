import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MenuCategory, MenuItem, ModifierGroup } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cardStyle, Chips, Field, PhotoField, SwitchRow, TitledSection } from '../../kit';
import { AddOnsEditor } from './AddOnsEditor';
import { DishStatusFields } from './DishStatusFields';
import { FormLabel } from './FormLabel';
import { fieldStyles } from './fieldStyles';
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
  library,
  timeZone,
  onDone,
  children,
}: {
  item: MenuItem | null;
  sections: MenuCategory[];
  defaultSectionId: string;
  venueId: string;
  currency: string;
  library: ModifierGroup[];
  timeZone: string;
  onDone: () => void;
  children: (form: Form) => ReactNode;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const form = useDishForm({ item, venueId, defaultSectionId, library, timeZone, onSaved: onDone });
  const { fields: f, set, error } = form;
  const sectionError = error('section');
  return (
    <View style={styles.stack}>
      <TitledSection plain title={t('ownerMenu.photo')}>
        <PhotoField
          venueId={venueId}
          url={f.photoUrl}
          label={t('ownerMenu.photo')}
          onChange={set.photo}
        />
      </TitledSection>

      <TitledSection plain title={t('ownerMenu.details')}>
        <Field
          label={t('ownerMenu.dishName')}
          value={f.name}
          onChangeText={set.name}
          placeholder={t('ownerMenu.dishNameHint')}
          error={error('name')}
          autoCapitalize="sentences"
        />
        <Field
          label={t('ownerMenu.description')}
          value={f.description}
          onChangeText={set.description}
          placeholder={t('ownerMenu.descriptionHint')}
          multiline
        />
        <View style={fieldStyles.block}>
          <FormLabel>{t('ownerMenu.section')}</FormLabel>
          <Chips
            single
            label={t('ownerMenu.section')}
            options={sections.map((s) => ({ id: s.id, label: s.name.en }))}
            selected={[f.sectionId]}
            onChange={(ids) => set.sectionId(ids[0] ?? '')}
          />
          {sectionError ? (
            <Text variant="caption" style={{ color: theme.error }}>
              {sectionError}
            </Text>
          ) : null}
        </View>
        <Field
          label={t('ownerMenu.calories')}
          value={f.calories}
          onChangeText={set.calories}
          placeholder="520"
          keyboardType="number-pad"
        />
      </TitledSection>

      <TitledSection plain title={t('ownerMenu.priceTitle')}>
        <View style={fieldStyles.pair}>
          <View style={fieldStyles.half}>
            <Field
              label={t('ownerMenu.price', { currency })}
              value={f.price}
              onChangeText={set.price}
              placeholder="65.00"
              keyboardType="decimal-pad"
              error={error('price')}
            />
          </View>
          <View style={fieldStyles.half}>
            <Field
              label={t('ownerMenu.salePrice', { currency })}
              value={f.stockDraft.salePrice}
              onChangeText={(salePrice) => set.stockDraft({ ...f.stockDraft, salePrice })}
              placeholder="55.00"
              keyboardType="decimal-pad"
              error={error('salePrice')}
            />
          </View>
        </View>
      </TitledSection>

      <TitledSection plain title={t('ownerMenu.showTitle')}>
        <DishStatusFields
          status={f.status}
          onStatus={set.status}
          snooze={f.snooze}
          onSnooze={set.snooze}
          back={f.back}
        />
        {/* Popular puts a tag on the dish for guests; the guest menu can sort by it. */}
        <View style={cardStyle(theme)}>
          <SwitchRow
            label={t('ownerMenu.popular')}
            value={f.badges.includes('popular')}
            onChange={set.togglePopular}
          />
        </View>
      </TitledSection>

      <TitledSection plain title={t('ownerMenu.addOnsTitle')}>
        {library.length > 0 ? (
          <View style={fieldStyles.block}>
            <FormLabel>{t('ownerMenu.shared.title')}</FormLabel>
            <Chips
              label={t('ownerMenu.shared.title')}
              options={library.map((g) => ({ id: g.id, label: g.name.en }))}
              selected={f.groupIds}
              onChange={set.groupIds}
            />
          </View>
        ) : null}
        {error('addOns') ? (
          <Text variant="caption" style={{ color: theme.error }}>
            {error('addOns')}
          </Text>
        ) : null}
        <AddOnsEditor groups={f.groups} onChange={set.groups} />
      </TitledSection>

      <TitledSection plain title={t('ownerMenu.stockTitle')}>
        <DishStockFields draft={f.stockDraft} onDraft={set.stockDraft} error={error} />
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
});

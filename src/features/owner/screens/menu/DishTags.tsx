import { useTranslation } from 'react-i18next';
import type { MenuItem } from '@/lib/api/types';
import { Chips, TitledSection } from '../../kit';
import { TagInput } from '../../kit/TagInput';
import { ALLERGENS, DIETS } from './options';
import { addTag } from './tags';

// Matches the contract: dietaryCustom has at most 6 entries of up to 24 characters.
const MAX_TAGS = 6;
const MAX_LENGTH = 24;
// Allergens are free text in the contract; keep typed ones to the same length as diets.
const MAX_ALLERGENS = ALLERGENS.length + MAX_TAGS;

/**
 * Diet and allergen pickers for a dish. Each shows the standard chips plus any the owner typed
 * in; unticking a typed chip removes it.
 */
export function DishTags({
  dietary,
  dietaryCustom,
  allergens,
  onDietary,
  onDietaryCustom,
  onAllergens,
}: {
  dietary: MenuItem['dietary'];
  dietaryCustom: string[];
  allergens: string[];
  onDietary: (next: MenuItem['dietary']) => void;
  onDietaryCustom: (next: string[]) => void;
  onAllergens: (next: string[]) => void;
}) {
  const { t } = useTranslation();
  const errorText = (reason: string) => t(`ownerMenu.tagError.${reason}`, { max: MAX_LENGTH });

  const knownDiets = DIETS.map((d) => ({ id: d, label: t(`dietary.${d}`) }));
  const knownAllergens = ALLERGENS.map((a) => ({ id: a, label: t(`ownerMenu.allergen.${a}`) }));
  const typedAllergens = allergens.filter((a) => !(ALLERGENS as readonly string[]).includes(a));

  return (
    <>
      <TitledSection plain title={t('ownerMenu.dietTitle')}>
        <Chips
          label={t('ownerMenu.dietTitle')}
          options={[...knownDiets, ...dietaryCustom.map((d) => ({ id: d, label: d }))]}
          selected={[...dietary, ...dietaryCustom]}
          onChange={(next) => {
            onDietary(next.filter((id) => (DIETS as string[]).includes(id)) as MenuItem['dietary']);
            onDietaryCustom(dietaryCustom.filter((d) => next.includes(d)));
          }}
        />
        <TagInput
          label={t('ownerMenu.dietAddLabel')}
          placeholder={t('ownerMenu.dietAddHint')}
          addLabel={t('ownerMenu.tagAdd')}
          onAdd={(text) => {
            const result = addTag(text, {
              custom: dietaryCustom,
              known: knownDiets,
              max: MAX_TAGS,
              maxLength: MAX_LENGTH,
            });
            if (result.kind === 'error') return errorText(result.reason);
            if (result.kind === 'known') {
              const id = result.id as MenuItem['dietary'][number];
              if (!dietary.includes(id)) onDietary([...dietary, id]);
            } else onDietaryCustom(result.next);
            return null;
          }}
        />
      </TitledSection>

      <TitledSection plain title={t('ownerMenu.allergensTitle')}>
        <Chips
          label={t('ownerMenu.allergensTitle')}
          options={[...knownAllergens, ...typedAllergens.map((a) => ({ id: a, label: a }))]}
          selected={allergens}
          onChange={onAllergens}
        />
        <TagInput
          label={t('ownerMenu.allergenAddLabel')}
          placeholder={t('ownerMenu.allergenAddHint')}
          addLabel={t('ownerMenu.tagAdd')}
          onAdd={(text) => {
            const result = addTag(text, {
              custom: typedAllergens,
              known: knownAllergens,
              max: MAX_ALLERGENS - ALLERGENS.length,
              maxLength: MAX_LENGTH,
            });
            if (result.kind === 'error') return errorText(result.reason);
            if (result.kind === 'known') {
              if (!allergens.includes(result.id)) onAllergens([...allergens, result.id]);
            } else onAllergens([...allergens, result.next[result.next.length - 1] ?? '']);
            return null;
          }}
        />
      </TitledSection>
    </>
  );
}

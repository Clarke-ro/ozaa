import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InputRow, SwitchRow } from '../../kit';

/**
 * A treat as a switch. On shows a box for what the guest gets; off clears it, so an empty
 * treat is never saved by mistake. The API stores just the text (empty means off).
 */
export function TreatToggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const { t } = useTranslation();
  const [on, setOn] = useState(value.trim().length > 0);
  return (
    <>
      <SwitchRow
        label={label}
        hint={hint}
        value={on}
        onChange={(next) => {
          setOn(next);
          if (!next) onChange('');
        }}
      />
      {on ? (
        <InputRow
          label={t('ownerLoyalty.treatWhat')}
          value={value}
          onChangeText={onChange}
          placeholder={t('ownerLoyalty.treatHint')}
        />
      ) : null}
    </>
  );
}

declare const pesewasBrand: unique symbol;
declare const phoneBrand: unique symbol;

/** Whole pesewas. 1 cedis is 100. Never a float. */
export type Pesewas = number & { readonly [pesewasBrand]: 'Pesewas' };

/** Ghana number stored as E.164, for example +233244000000. */
export type GhanaPhone = string & { readonly [phoneBrand]: 'GhanaPhone' };

export function isPesewas(value: number): value is Pesewas {
  return Number.isInteger(value) && value >= 0 && value <= 100_000_000;
}

export function pesewas(value: number): Pesewas {
  if (!isPesewas(value)) throw new Error('Money must be a whole number of pesewas');
  return value;
}

export function isGhanaPhone(value: string): value is GhanaPhone {
  return /^\+233\d{9}$/.test(value);
}

export function ghanaPhone(value: string): GhanaPhone {
  if (!isGhanaPhone(value)) throw new Error('Phone must be E.164 +233 and 9 digits');
  return value;
}

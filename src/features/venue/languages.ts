import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/i18n';

export const LANGUAGE_KEY = 'ozaa:language';

export const LANGUAGES = [
  { code: 'en', label: 'English', ready: true },
  { code: 'tw', label: 'Twi', ready: false },
  { code: 'ga', label: 'Ga', ready: false },
  { code: 'ee', label: 'Ewe', ready: false },
  { code: 'ha', label: 'Hausa', ready: false },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export function languageByCode(code: string | undefined) {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
}

export async function applySavedLanguage(): Promise<void> {
  const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  const language = languageByCode(saved ?? undefined);
  if (!language.ready) return;
  await i18n.changeLanguage(language.code);
}

export async function chooseLanguage(code: LanguageCode): Promise<void> {
  const language = languageByCode(code);
  if (!language.ready) return;
  await AsyncStorage.setItem(LANGUAGE_KEY, language.code);
  await i18n.changeLanguage(language.code);
}

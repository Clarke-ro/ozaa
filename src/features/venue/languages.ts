import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyTextDirection } from '@/i18n/direction';
import i18n from '@/i18n';

export const LANGUAGE_KEY = 'cravins:language';

/**
 * Global list. Add a language by appending a row and a locale file.
 * `ready` stays false until a native speaker has filled the strings.
 * Arabic is right-to-left even while it is still coming soon.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', ready: true, dir: 'ltr' },
  { code: 'fr', label: 'Français', ready: false, dir: 'ltr' },
  { code: 'pt', label: 'Português', ready: false, dir: 'ltr' },
  { code: 'es', label: 'Español', ready: false, dir: 'ltr' },
  { code: 'ar', label: 'العربية', ready: false, dir: 'rtl' },
  { code: 'sw', label: 'Kiswahili', ready: false, dir: 'ltr' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export function languageByCode(code: string | undefined) {
  const base = code?.split('-')[0];
  return LANGUAGES.find((language) => language.code === base) ?? LANGUAGES[0];
}

export async function applySavedLanguage(): Promise<void> {
  const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  const language = languageByCode(saved ?? undefined);
  if (!language.ready) {
    applyTextDirection('en');
    return;
  }
  await i18n.changeLanguage(language.code);
  applyTextDirection(language.code);
}

export async function chooseLanguage(code: LanguageCode): Promise<void> {
  const language = languageByCode(code);
  if (!language.ready) return;
  await AsyncStorage.setItem(LANGUAGE_KEY, language.code);
  await i18n.changeLanguage(language.code);
  applyTextDirection(language.code);
}

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import sw from './locales/sw.json';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    pt: { translation: pt },
    es: { translation: es },
    ar: { translation: ar },
    sw: { translation: sw },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  // A new language is a locale file plus a row in LANGUAGES. Empty files fall back to English.
  supportedLngs: ['en', 'fr', 'pt', 'es', 'ar', 'sw'],
});

export default i18n;

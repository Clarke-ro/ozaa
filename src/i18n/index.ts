import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ee from './locales/ee.json';
import ga from './locales/ga.json';
import tw from './locales/tw.json';

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, tw: { translation: tw }, ga: { translation: ga }, ee: { translation: ee } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export default i18n;

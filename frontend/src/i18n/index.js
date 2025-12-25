import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import enLanding from '../locales/en/landing.json';
import enDashboard from '../locales/en/dashboard.json';
import enAuth from '../locales/en/auth.json';

import arCommon from '../locales/ar/common.json';
import arLanding from '../locales/ar/landing.json';
import arDashboard from '../locales/ar/dashboard.json';
import arAuth from '../locales/ar/auth.json';

const resources = {
  en: {
    common: enCommon,
    landing: enLanding,
    dashboard: enDashboard,
    auth: enAuth
  },
  ar: {
    common: arCommon,
    landing: arLanding,
    dashboard: arDashboard,
    auth: arAuth
  }
};

// RTL languages
export const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

// Check if language is RTL
export const isRTL = (lang) => RTL_LANGUAGES.includes(lang);

// Available languages
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' }
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'landing', 'dashboard', 'auth'],

    interpolation: {
      escapeValue: false // React already escapes values
    },

    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Key for localStorage
      lookupLocalStorage: 'aiden-language',
      // Cache language in localStorage
      caches: ['localStorage']
    },

    react: {
      useSuspense: false
    }
  });

// Update document direction and language when language changes
i18n.on('languageChanged', (lng) => {
  const dir = isRTL(lng) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;

  // Store preference
  localStorage.setItem('aiden-language', lng);
});

// Set initial direction
const initialLang = i18n.language || 'en';
document.documentElement.dir = isRTL(initialLang) ? 'rtl' : 'ltr';
document.documentElement.lang = initialLang;

export default i18n;

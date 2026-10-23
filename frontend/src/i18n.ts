import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const STORAGE_KEY = 'tv4all_language';

/**
 * Resolves the initial language based on:
 * 1. Stored language in localStorage
 * 2. Browser language (normalizing e.g. 'en-CA', 'en-US' -> 'en', 'fr-FR' -> 'fr', 'es-MX' -> 'es')
 * 3. Default fallback to 'en' (English) if browser language is neither of the 3
 */
export function resolveInitialLanguage(): SupportedLanguage {
  // 1. Check localStorage first
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) {
        return stored as SupportedLanguage;
      }
    } catch {
      // Ignore localStorage errors (e.g. private browsing mode)
    }
  }

  // 2. Check browser language
  if (typeof navigator !== 'undefined') {
    const rawLang = (navigator.language || (navigator as any).userLanguage || '').toLowerCase();
    // Normalize e.g. "en-us", "en-CA", "fr-FR", "es-ES" to the primary 2-letter code
    const baseCode = rawLang.split(/[-_]/)[0];

    if (SUPPORTED_LANGUAGES.includes(baseCode as SupportedLanguage)) {
      return baseCode as SupportedLanguage;
    }
  }

  // 3. Fallback to English
  return 'en';
}

const initialLang = resolveInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es }
    },
    lng: initialLang,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

// Persist any language switch to localStorage
i18n.on('languageChanged', (lng: string) => {
  const baseCode = lng.split(/[-_]/)[0] as SupportedLanguage;
  if (SUPPORTED_LANGUAGES.includes(baseCode)) {
    try {
      localStorage.setItem(STORAGE_KEY, baseCode);
    } catch {
      // Ignore
    }
  }
});

export default i18n;


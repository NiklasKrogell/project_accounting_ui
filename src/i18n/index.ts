import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fi from './locales/fi.json';
import en from './locales/en.json';

// Localization setup. Finnish is the product's primary language and the
// default; English is the fallback and alternative. The chosen language is
// persisted in localStorage so it survives reloads. Add a language by dropping
// a JSON file in ./locales and registering it here + in SUPPORTED_LANGUAGES.

export const SUPPORTED_LANGUAGES = ['fi', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'lang';

function isSupported(value: string | null): value is Language {
  return value !== null && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isSupported(saved)) return saved;
  } catch {
    // localStorage may be unavailable (private mode / tests); fall through.
  }
  return 'fi';
}

void i18n.use(initReactI18next).init({
  resources: {
    fi: { translation: fi },
    en: { translation: en },
  },
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
});

// Keep the document language in sync for accessibility and the browser.
function syncHtmlLang(lng: string): void {
  if (typeof document !== 'undefined') document.documentElement.lang = lng;
}
syncHtmlLang(i18n.language);

export function changeLanguage(lng: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // ignore persistence failure
  }
  void i18n.changeLanguage(lng);
  syncHtmlLang(lng);
}

export default i18n;

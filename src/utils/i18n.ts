import { LocalizedString, SupportedLanguage } from '../types';

/**
 * Localization helper function to extract current language string with fallback to English
 */
export const resolveLocalizedString = (
  localized: LocalizedString | string | undefined | null,
  lang: SupportedLanguage = 'en'
): string => {
  if (!localized) return '';
  if (typeof localized === 'string') return localized;

  const text = (localized as Record<string, string>)[lang];
  if (text && text.trim().length > 0) return text;

  // Fallback to English
  if (localized.en && localized.en.trim().length > 0) return localized.en;

  // Fallback to first available key
  const values = Object.values(localized);
  return values.length > 0 ? values[0] : '';
};

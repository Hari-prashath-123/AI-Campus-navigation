/**
 * Multilingual / i18n Types
 */

export type SupportedLanguage = 'en' | 'ta' | 'hi';

export type LocalizedString = Record<SupportedLanguage, string> | { en: string; [key: string]: string };

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flagEmoji: string;
}

export interface TranslationDictionary {
  common: Record<string, string>;
  navigation: Record<string, string>;
  campus: Record<string, string>;
  editor: Record<string, string>;
  ai: Record<string, string>;
  workflow: Record<string, string>;
  errors: Record<string, string>;
}
